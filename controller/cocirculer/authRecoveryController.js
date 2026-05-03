import bcrypt from 'bcrypt';
import CocicularModel from '../../models/Cocirculer/cocerculerProfile.js';
import { generateTempPassword } from '../../utils/credentials.js';
import { sendCredentialTemplateEmail } from '../../notification/index.js';
import logger from '../../notification/services/logger.js';

const recoverCocirculerCredentialsByEmail = async (req, res) => {
  try {
    const { email } = req.body || {};
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail) {
      return res.json({ success: false, message: 'email is required' });
    }

    const cocircular = await CocicularModel.findOne({ email: normalizedEmail });
    if (!cocircular) {
      return res.json({ success: false, message: 'Co-curricular account not found with this email' });
    }

    const newPassword = generateTempPassword();
    cocircular.password = await bcrypt.hash(newPassword, 10);
    await cocircular.save();

    const mailResult = await sendCredentialTemplateEmail({
      to: cocircular.email,
      name: cocircular.name || cocircular.email,
      username: cocircular.email,
      password: newPassword,
      label: 'Co-Curricular Credential Recovery'
    });

    return res.json({
      success: true,
      message: 'Co-curricular credentials recovered successfully',
      email: {
        sent: mailResult.sent,
        reason: mailResult.reason || null
      },
      credentials: mailResult.sent
        ? undefined
        : {
            username: cocircular.email,
            password: newPassword
          }
    });
  } catch (error) {
    logger.error('Failed to recover co-curricular credentials', { error: error.message });
    return res.json({ success: false, message: error.message });
  }
};

export { recoverCocirculerCredentialsByEmail };
