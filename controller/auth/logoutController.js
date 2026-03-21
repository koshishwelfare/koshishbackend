import { clearAuthCookie } from '../../config/authCookies.js';

const logoutTeacher = async (req, res) => {
  try {
    clearAuthCookie(res, 'teacherToken');
    return res.json({ success: true, message: 'Teacher logout successful' });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

const logoutCoordinator = async (req, res) => {
  try {
    clearAuthCookie(res, 'coordinatorToken');
    return res.json({ success: true, message: 'Coordinator logout successful' });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

const logoutCocirculer = async (req, res) => {
  try {
    clearAuthCookie(res, 'cocirculerToken');
    return res.json({ success: true, message: 'Co-curricular logout successful' });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export { logoutTeacher, logoutCoordinator, logoutCocirculer };
