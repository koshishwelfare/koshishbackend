import config from '../../config.js';
import { setAuthCookie } from '../../config/authCookies.js';
import { createRoleToken } from '../../utils/authToken.js';
import { sendAuthNotificationEmail } from '../../utils/mailer.js';

import bcrypt from 'bcrypt';
import MemberModel from '../../models/member/MemberSchema.js';
const loginTeacher = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.json({ success: false, message: 'Username and password are required' });
    }

    const teacher = await MemberModel.findOne({ username, role: 'mentor' });
    if (!teacher || !teacher.password) {
      return res.json({ success: false, message: 'Invalid username or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, teacher.password);
    if (!isPasswordValid) {
      return res.json({ success: false, message: 'Invalid username or password' });
    }

    const token = createRoleToken({ role: 'teacher', userId: teacher._id.toString() });
    setAuthCookie(res, 'teacherToken', token);
    
    await sendAuthNotificationEmail({
      to: teacher.email,
      role: 'teacher',
      eventType: 'login',
      actor: teacher.username,
      timestamp: new Date().toISOString(),
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: 'Teacher login successful',
      token,
      teacher: {
        _id: teacher._id,
        username: teacher.username,
        email: teacher.email,
        phoneNumber: teacher.phoneNumber
      }
    });

  } catch (error) {
    console.error('Teacher login error:', error);
    return res.json({
      success: false,
      message: error.message
    });
  }
};

export default loginTeacher;
