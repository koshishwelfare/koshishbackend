import { verifyAuthToken } from '../../utils/authToken.js';

const authTeacher = async (req, res, next) => {
  try {
    const { authteachertoken } = req.headers;
    const cookieToken = req.cookies?.teacherToken;
    const token = authteachertoken || cookieToken;

    if (!token) {
      return res.json({ sucess: false, authteachertoken: `${token}`, message: 'Web token is Null or undefined' });
    }

    const tokenDecode = verifyAuthToken(token);
    if (tokenDecode?.role !== 'teacher' && tokenDecode?.role !== 'mentor') {
      return res.json({ sucess: false, message: 'Not Authorized Login again' });
    }

    req.teacher = tokenDecode;
    req.authRole = tokenDecode.role === 'mentor' ? 'teacher' : tokenDecode.role;

    return next();
  } catch (error) {
    return res.json({ sucess: false, message: error.message });
  }
};

export default authTeacher;
