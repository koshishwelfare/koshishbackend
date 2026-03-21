import bcrypt from 'bcrypt';
import validator from 'validator';
import { Student } from '../../models/student/studentSchema.js';
import { clearAuthCookie, setAuthCookie } from '../../config/authCookies.js';
import { generateTempPassword } from '../../utils/credentials.js';
import { sendAuthNotificationEmail, sendCredentialTemplateEmail } from '../../utils/mailer.js';
import { createStudentToken } from '../../utils/authToken.js';

const sanitizeStudent = (studentDoc) => {
  return {
    _id: studentDoc._id,
    name: studentDoc.name,
    username: studentDoc.username,
    email: studentDoc.email,
    rollNumber: studentDoc.rollNumber,
    registrationNumber: studentDoc.registrationNumber,
    phoneNumber: studentDoc.phoneNumber,
    course: studentDoc.course,
    year: studentDoc.year,
    profileImage: studentDoc.profileImage,
    bio: studentDoc.bio
  };
};

const registerStudent = async (req, res) => {
  try {
    const {
      name,
      username,
      email,
      password,
      registrationNumber,
      phoneNumber,
      course,
      year
    } = req.body;

    if (!name || !username || !email || !password || !registrationNumber || !phoneNumber) {
      return res.json({ success: false, message: 'Please provide all required fields' });
    }

    if (!validator.isEmail(email)) {
      return res.json({ success: false, message: 'Please provide a valid email address' });
    }

    if (String(password).length < 8) {
      return res.json({ success: false, message: 'Password must be at least 8 characters long' });
    }

    const normalizedUsername = String(username).trim().toLowerCase();
    const existingByUsername = await Student.findOne({ username: normalizedUsername });
    if (existingByUsername) {
      return res.json({ success: false, message: 'Username is already taken' });
    }

    const existingByReg = await Student.findOne({ registrationNumber });
    if (existingByReg) {
      return res.json({ success: false, message: 'Student already exists with this registration number' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const student = await Student.create({
      name,
      username: normalizedUsername,
      email: email.toLowerCase(),
      password: hashedPassword,
      registrationNumber,
      phoneNumber,
      course,
      year
    });

    const token = createStudentToken({ studentId: student._id.toString() });
    setAuthCookie(res, 'studentToken', token);
    await sendAuthNotificationEmail({
      to: student.email,
      role: 'student',
      eventType: 'register',
      actor: student.email,
      timestamp: new Date().toISOString(),
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: 'Student registered successfully',
      token,
      student: sanitizeStudent(student)
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const loginStudent = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.json({ success: false, message: 'Username and password are required' });
    }

    const student = await Student.findOne({ username: String(username).trim().toLowerCase() });
    if (!student || !student.password) {
      return res.json({ success: false, message: 'Invalid username or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, student.password);
    if (!isPasswordValid) {
      return res.json({ success: false, message: 'Invalid username or password' });
    }

    const token = createStudentToken({ studentId: student._id.toString() });
    setAuthCookie(res, 'studentToken', token);
    await sendAuthNotificationEmail({
      to: student.email,
      role: 'student',
      eventType: 'login',
      actor: student.email,
      timestamp: new Date().toISOString(),
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      student: sanitizeStudent(student)
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const getStudentProfile = async (req, res) => {
  try {
    const student = await Student.findById(req.studentId);
    if (!student) {
      return res.json({ success: false, message: 'Student not found' });
    }

    return res.json({
      success: true,
      message: 'Student profile fetched successfully',
      student: sanitizeStudent(student)
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const updateStudentProfile = async (req, res) => {
  try {
    const allowedFields = ['name', 'phoneNumber', 'course', 'year', 'bio', 'profileImage'];
    const updateData = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    const student = await Student.findByIdAndUpdate(
      req.studentId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!student) {
      return res.json({ success: false, message: 'Student not found' });
    }

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      student: sanitizeStudent(student)
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const logoutStudent = async (req, res) => {
  try {
    clearAuthCookie(res, 'studentToken');
    return res.json({ success: true, message: 'Logout successful' });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const recoverStudentCredentialsByEmail = async (req, res) => {
  try {
    const { email, username } = req.body;

    if (!email && !username) {
      return res.json({ success: false, message: 'email or username is required' });
    }

    let student = null;
    if (username) {
      student = await Student.findOne({ username: String(username).trim().toLowerCase() });
    } else {
      const matches = await Student.find({ email: String(email).toLowerCase() }).limit(2);
      if (matches.length > 1) {
        return res.json({
          success: false,
          message: 'Multiple students found with this email. Please recover using username.'
        });
      }
      student = matches[0] || null;
    }

    if (!student) {
      return res.json({ success: false, message: 'Student not found' });
    }

    const newPassword = generateTempPassword();
    student.password = await bcrypt.hash(newPassword, 10);
    await student.save();

    const usernameValue = student.username || student.registrationNumber || student.email;
    const mailResult = await sendCredentialTemplateEmail({
      to: student.email,
      name: student.name,
      username: usernameValue,
      password: newPassword,
      label: 'Student Credential Recovery'
    });

    return res.json({
      success: true,
      message: 'Student credentials recovered successfully',
      email: {
        sent: mailResult.sent,
        reason: mailResult.reason || null
      },
      credentials: mailResult.sent ? undefined : {
        username: usernameValue,
        password: newPassword
      }
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

export {
  registerStudent,
  loginStudent,
  logoutStudent,
  getStudentProfile,
  updateStudentProfile,
  recoverStudentCredentialsByEmail
};
