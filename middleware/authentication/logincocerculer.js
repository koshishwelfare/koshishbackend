import { setAuthCookie } from '../../config/authCookies.js';
import { createRoleToken } from '../../utils/authToken.js';
import { sendAuthNotificationEmail } from '../../utils/mailer.js';

import bcrypt from 'bcrypt';
import CocicularModel from '../../models/Cocirculer/cocerculerProfile.js';

const loginCociculer = async (req, res) => {
  try {
    const { username: email, password } = req.body;

    if (!email || !password) {
      return res.json({ success: false, message: 'Email and password are required' });
    }

    const cocircular = await CocicularModel.findOne({ email: email.toLowerCase() });
    if (!cocircular || !cocircular.password) {
      return res.json({ success: false, message: 'Invalid email or password' });
    }

    if (!cocircular.isactive) {
      return res.json({ success: false, message: 'Account is deactivated. Please contact coordinator.' });
    }

    const isPasswordValid = await bcrypt.compare(password, cocircular.password);
    if (!isPasswordValid) {
      return res.json({ success: false, message: 'Invalid email or password' });
    }

    const token = createRoleToken({ role: 'cocirculer', userId: cocircular._id.toString() });
    setAuthCookie(res, 'cocirculerToken', token);
    
    await sendAuthNotificationEmail({
      to: cocircular.email,
      role: 'cocircular',
      eventType: 'login',
      actor: cocircular.email,
      timestamp: new Date().toISOString(),
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: 'Co-Curricular login successful',
      token,
      cocirculertoken: token,
      cocircular: {
        _id: cocircular._id,
        name: cocircular.name,
        email: cocircular.email,
        speciality: cocircular.speciality
      }
    });

  } catch (error) {
    console.error('Co-Curricular login error:', error);
    return res.json({
      success: false,
      message: error.message
    });
  }
};

export default loginCociculer;