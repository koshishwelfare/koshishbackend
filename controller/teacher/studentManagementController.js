import bcrypt from 'bcrypt';
import { Student } from '../../models/student/studentSchema.js';
import MemberModel from '../../models/member/MemberSchema.js';
import { Class } from '../../models/class/classSchema.js';
import { StudentAttendance } from '../../models/student/studentAttendanceSchema.js';
import { TestSubmission } from '../../models/App/testSubmissionSchema.js';
import { generateTempPassword, generateUsernameFromName } from '../../utils/credentials.js';
import { sendCredentialTemplateEmail } from '../../utils/mailer.js';

const getNextRollNumber = async (classId, sessionId) => {
  const count = await Student.countDocuments({ classId, sessionId });
  return `R-${String(count + 1).padStart(3, '0')}`;
};

const addStudentByTeacher = async (req, res) => {
  try {
    const teacherId = req.teacher?.userId;
    const { name, username, email, phoneNumber, classId, sessionId } = req.body;

    if (!name || !email || !phoneNumber || !classId || !sessionId) {
      return res.json({ success: false, message: 'name, email, phoneNumber, classId and sessionId are required' });
    }

    const classData = await Class.findById(classId).select('_id teacherId teacherIds sessionId isActive');
    if (!classData || classData.isActive === false) {
      return res.json({ success: false, message: 'Invalid classId' });
    }

    if (String(classData.sessionId || '') !== String(sessionId)) {
      return res.json({ success: false, message: 'sessionId does not match selected class' });
    }

    const classTeacherIds = Array.isArray(classData.teacherIds) ? classData.teacherIds.map((id) => String(id)) : [];
    const isTeacherAssigned =
      (classData.teacherId && String(classData.teacherId) === String(teacherId)) ||
      classTeacherIds.includes(String(teacherId));

    if ((classData.teacherId || classTeacherIds.length) && !isTeacherAssigned) {
      return res.json({ success: false, message: 'You are not assigned to this class' });
    }

    if (teacherId && !classTeacherIds.includes(String(teacherId))) {
      classData.teacherIds = [...(classData.teacherIds || []), teacherId];
    }

    if (!classData.teacherId && teacherId) {
      classData.teacherId = teacherId;
      await classData.save();
    } else if (teacherId && !isTeacherAssigned) {
      await classData.save();
    }

    const generatedUsername = String(username || generateUsernameFromName(name)).trim().toLowerCase();
    const existingByUsername = await Student.findOne({ username: generatedUsername });
    if (existingByUsername) {
      return res.json({ success: false, message: 'Username already exists. Please use another username.' });
    }

    const plainPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    const rollNumber = await getNextRollNumber(classId, sessionId);

    const student = await Student.create({
      name,
      username: generatedUsername,
      email: String(email).toLowerCase(),
      password: hashedPassword,
      phoneNumber,
      rollNumber,
      registrationNumber: rollNumber,
      classId: String(classId),
      sessionId: String(sessionId)
    });

    const mailResult = await sendCredentialTemplateEmail({
      to: student.email,
      name: student.name,
      username: generatedUsername,
      password: plainPassword,
      label: `Student Account Created (Roll: ${rollNumber})`
    });

    return res.json({
      success: true,
      message: 'Student added successfully',
      data: {
        _id: student._id,
        name: student.name,
        username: student.username,
        email: student.email,
        phoneNumber: student.phoneNumber,
        rollNumber: student.rollNumber
      },
      email: {
        sent: mailResult.sent,
        reason: mailResult.reason || null
      },
      credentials: mailResult.sent ? undefined : {
        username: generatedUsername,
        password: plainPassword
      }
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const recoverTeacherCredentialsByEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.json({ success: false, message: 'email is required' });
    }

    const teacher = await MemberModel.findOne({ email: String(email).toLowerCase(), role: 'mentor' });
    if (!teacher) {
      return res.json({ success: false, message: 'Teacher not found with this email' });
    }

    const newPassword = generateTempPassword();
    teacher.password = await bcrypt.hash(newPassword, 10);
    await teacher.save();

    const mailResult = await sendCredentialTemplateEmail({
      to: teacher.email,
      name: teacher.username,
      username: teacher.username,
      password: newPassword,
      label: 'Teacher Credential Recovery'
    });

    return res.json({
      success: true,
      message: 'Teacher credentials recovered successfully',
      email: {
        sent: mailResult.sent,
        reason: mailResult.reason || null
      },
      credentials: mailResult.sent ? undefined : {
        username: teacher.username,
        password: newPassword
      }
    });
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
        return res.json({ success: false, message: 'Multiple students found with this email. Use username.' });
      }
      student = matches[0] || null;
    }

    if (!student) {
      return res.json({ success: false, message: 'Student not found' });
    }

    const newPassword = generateTempPassword();
    student.password = await bcrypt.hash(newPassword, 10);
    await student.save();

    const mailResult = await sendCredentialTemplateEmail({
      to: student.email,
      name: student.name,
      username: student.username || student.email,
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
        username: student.username || student.email,
        password: newPassword
      }
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const listStudentsByTeacher = async (req, res) => {
  try {
    const teacherId = req.teacher?.userId;
    if (!teacherId) {
      return res.json({ success: false, message: 'Teacher authentication required' });
    }

    const {
      search = '',
      sessionId = '',
      classId = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10
    } = req.query || {};

    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);

    const teacherClasses = await Class.find({
      isActive: true,
      $or: [{ teacherId }, { teacherIds: teacherId }]
    }).select('_id sessionId');
    const teacherClassIds = teacherClasses.map((cls) => cls._id);
    if (!teacherClassIds.length) {
      return res.json({
        success: true,
        message: 'Students fetched successfully',
        data: {
          records: [],
          pagination: {
            page: safePage,
            limit: safeLimit,
            total: 0,
            totalPages: 1
          }
        }
      });
    }

    const filter = {
      classId: { $in: teacherClassIds }
    };

    if (classId) {
      const isOwnedClass = teacherClassIds.some((id) => String(id) === String(classId));
      if (!isOwnedClass) {
        return res.json({ success: false, message: 'You are not assigned to selected class' });
      }
      filter.classId = classId;
    }

    if (sessionId) {
      filter.sessionId = sessionId;
    }

    const safeSearch = String(search || '').trim();
    if (safeSearch) {
      filter.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { username: { $regex: safeSearch, $options: 'i' } },
        { email: { $regex: safeSearch, $options: 'i' } },
        { rollNumber: { $regex: safeSearch, $options: 'i' } },
        { registrationNumber: { $regex: safeSearch, $options: 'i' } }
      ];
    }

    const allowedSort = ['name', 'username', 'email', 'rollNumber', 'createdAt'];
    const effectiveSortBy = allowedSort.includes(String(sortBy)) ? String(sortBy) : 'createdAt';
    const effectiveSortOrder = String(sortOrder).toLowerCase() === 'asc' ? 1 : -1;

    const total = await Student.countDocuments(filter);
    const records = await Student.find(filter)
      .select('_id name username email phoneNumber rollNumber registrationNumber classId sessionId createdAt')
      .populate('classId', '_id name grade section sessionId')
      .populate('sessionId', '_id name startYear endYear')
      .sort({ [effectiveSortBy]: effectiveSortOrder, _id: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit);

    return res.json({
      success: true,
      message: 'Students fetched successfully',
      data: {
        records,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          totalPages: Math.max(Math.ceil(total / safeLimit), 1)
        },
        filters: {
          search: safeSearch,
          sessionId: sessionId || null,
          classId: classId || null,
          sortBy: effectiveSortBy,
          sortOrder: effectiveSortOrder === 1 ? 'asc' : 'desc'
        }
      }
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const getStudentPerformanceByTeacher = async (req, res) => {
  try {
    const teacherId = req.teacher?.userId;
    const { studentId } = req.params;

    if (!teacherId || !studentId) {
      return res.json({ success: false, message: 'Teacher authentication and studentId are required' });
    }

    const teacherClasses = await Class.find({
      isActive: true,
      $or: [{ teacherId }, { teacherIds: teacherId }]
    }).select('_id');
    const teacherClassIds = teacherClasses.map((cls) => cls._id);

    const student = await Student.findOne({
      _id: studentId,
      classId: { $in: teacherClassIds }
    })
      .select('_id name username email phoneNumber rollNumber registrationNumber classId sessionId course year createdAt')
      .populate('classId', '_id name grade section')
      .populate('sessionId', '_id name startYear endYear');

    if (!student) {
      return res.json({ success: false, message: 'Student not found or not assigned to your class' });
    }

    const attendanceRows = await StudentAttendance.find({ studentId })
      .select('date status remarks createdAt')
      .sort({ date: -1, createdAt: -1 })
      .limit(20)
      .lean();

    const attendanceTotals = attendanceRows.reduce(
      (acc, row) => {
        acc.total += 1;
        if (row.status === 'Present') acc.present += 1;
        if (row.status === 'Absent') acc.absent += 1;
        if (row.status === 'Late') acc.late += 1;
        return acc;
      },
      { total: 0, present: 0, absent: 0, late: 0 }
    );

    const attendancePercentage = attendanceTotals.total
      ? Number(((attendanceTotals.present / attendanceTotals.total) * 100).toFixed(2))
      : 0;

    const testSubmissions = await TestSubmission.find({ studentId })
      .select('score totalMarks submittedAt testId')
      .populate('testId', 'title subject className')
      .sort({ submittedAt: -1, createdAt: -1 })
      .limit(20)
      .lean();

    const testTotals = testSubmissions.reduce(
      (acc, row) => {
        const score = Number(row.score || 0);
        const totalMarks = Number(row.totalMarks || 0);
        acc.attempted += 1;
        acc.score += score;
        acc.totalMarks += totalMarks;
        if (totalMarks > 0) {
          const pct = (score / totalMarks) * 100;
          acc.bestPercentage = Math.max(acc.bestPercentage, pct);
        }
        return acc;
      },
      { attempted: 0, score: 0, totalMarks: 0, bestPercentage: 0 }
    );

    const averageScorePercentage = testTotals.totalMarks
      ? Number(((testTotals.score / testTotals.totalMarks) * 100).toFixed(2))
      : 0;

    return res.json({
      success: true,
      message: 'Student performance fetched successfully',
      data: {
        student,
        attendance: {
          totalRecords: attendanceTotals.total,
          present: attendanceTotals.present,
          absent: attendanceTotals.absent,
          late: attendanceTotals.late,
          attendancePercentage,
          recent: attendanceRows
        },
        tests: {
          attempted: testTotals.attempted,
          totalScore: testTotals.score,
          totalMarks: testTotals.totalMarks,
          averageScorePercentage,
          bestScorePercentage: Number(testTotals.bestPercentage.toFixed(2)),
          recent: testSubmissions
        }
      }
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

export {
  addStudentByTeacher,
  listStudentsByTeacher,
  getStudentPerformanceByTeacher,
  recoverTeacherCredentialsByEmail,
  recoverStudentCredentialsByEmail
};
