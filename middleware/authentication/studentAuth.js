import { verifyAuthToken } from '../../utils/authToken.js';

const studentAuth = async (req, res, next) => {
  try {
    const tokenFromHeader = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null;
    const authstudenttoken = req.headers.authstudenttoken;
    const tokenFromCookie = req.cookies?.studentToken;
    const token = tokenFromHeader || authstudenttoken || tokenFromCookie;

    if (!token) {
      return res.json({ success: false, message: 'Not authorized. Please login again' });
    }

    const decoded = verifyAuthToken(token);

    if (decoded?.role !== 'student' || !decoded?.studentId) {
      return res.json({ success: false, message: 'Invalid token. Please login again' });
    }

    req.studentId = decoded.studentId;
    return next();
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: 'Session expired. Please login again' });
  }
};

export default studentAuth;
