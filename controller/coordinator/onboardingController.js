import bcrypt from 'bcrypt';
import validator from 'validator';
import CocicularModel from '../../models/Cocirculer/cocerculerProfile.js';
import { sendCredentialTemplateEmail } from '../../utils/mailer.js';

/**
 * Onboard a new Co-Curricular user
 * Coordinator endpoint to add co-curricular members
 * POST /api/coordinater/onboard-cocircular
 */
const onboardCocircular = async (req, res) => {
  try {
    const { name, email, password, speciality, degree, about } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.json({
        success: false,
        message: 'name, email and password are required'
      });
    }

    // Validate email format
    if (!validator.isEmail(email)) {
      return res.json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Check if co-circular with email already exists
    const existingCocircular = await CocicularModel.findOne({
      email: email.toLowerCase()
    });

    if (existingCocircular) {
      return res.json({
        success: false,
        message: 'Co-Curricular user already exists with this email'
      });
    }

    if (String(password).length < 8) {
      return res.json({
        success: false,
        message: 'Password must be at least 8 characters'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Keep only one active co-curricular account at a time.
    await CocicularModel.updateMany({ isactive: true }, { isactive: false });

    // Create co-circular user
    const cocircular = await CocicularModel.create({
      name: String(name).trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      speciality: speciality || 'General',
      degree: degree || 'B.tech',
      about: about || 'Created by coordinator',
      isactive: true
    });

    const mailResult = await sendCredentialTemplateEmail({
      to: cocircular.email,
      name: cocircular.name,
      username: cocircular.email,
      password,
      label: 'Co-Curricular Onboarding Credentials'
    });

    return res.json({
      success: true,
      message: 'Co-Curricular user onboarded successfully',
      data: {
        _id: cocircular._id,
        name: cocircular.name,
        email: cocircular.email,
        speciality: cocircular.speciality,
        degree: cocircular.degree,
        isactive: cocircular.isactive,
        createdAt: cocircular.date
      },
      email: {
        sent: mailResult.sent,
        reason: mailResult.reason || null
      },
      credentials: mailResult.sent
        ? undefined
        : {
            username: cocircular.email,
            password
          }
    });
  } catch (error) {
    console.error('Onboard co-circular error:', error);
    return res.json({
      success: false,
      message: error.message
    });
  }
};

export { onboardCocircular };
