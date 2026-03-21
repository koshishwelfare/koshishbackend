import config from '../../config.js';
import { setAuthCookie } from '../../config/authCookies.js';
import { createRoleToken } from '../../utils/authToken.js';
import { sendAuthNotificationEmail } from '../../utils/mailer.js';

const loginCoordinater = async (req, res) => {
  try {
    const { username, password } = req.body;
    const normalizedUsername = String(username || '').trim().toLowerCase();
    const expectedUsername = String(config.auth.coordinator.username || '').trim().toLowerCase();

    const usernameMatch = normalizedUsername === expectedUsername;
    const passwordMatch = String(password || '') === String(config.auth.coordinator.password || '');

    if (usernameMatch && passwordMatch) {
      const token = createRoleToken({ role: 'coordinator', username: normalizedUsername });

      setAuthCookie(res, 'coordinatorToken', token);
      
      await sendAuthNotificationEmail({
        to: config.auth.coordinator.notifyEmail,
        role: 'coordinator',
        eventType: 'login',
        actor: normalizedUsername,
        timestamp: new Date().toISOString(),
        ipAddress: req.ip
      });

      return res.json({
        success: true,
        token,
        coordinatorToken: token,
        role: 'coordinator',
        cocirculertoken: token,
        message: 'Coordinator login successful'
      });
    } else {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Coordinator login error:', error);
    return res.status(500).json({ success: false, message: 'Coordinator login failed' });
  }
};

export default loginCoordinater;