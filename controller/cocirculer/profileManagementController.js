import CocicularModel from '../../models/Cocirculer/cocerculerProfile.js';
import { cloudinaryUploadImage } from '../../middleware/cloudimage/cloudinary.js';

const blockedFields = new Set(['_id', '__v', 'password', 'email', 'username', 'createdAt', 'updatedAt']);

const getOwnProfile = async (req, res) => {
  try {
    const userId = req.cocircular?.userId;
    const username = req.cocircular?.username;

    const profile = userId
      ? await CocicularModel.findById(userId).select('-password')
      : await CocicularModel.findOne({ email: String(username || '').toLowerCase() }).select('-password');

    if (!profile) {
      return res.json({ success: false, message: 'Profile not found. Please login again.' });
    }

    return res.json({ success: true, data: profile, message: 'Profile fetched successfully' });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const updateOwnProfile = async (req, res) => {
  try {
    const userId = req.cocircular?.userId;
    if (!userId) {
      return res.json({ success: false, message: 'Session expired. Please login again.' });
    }

    const updates = {};
    Object.keys(req.body || {}).forEach((key) => {
      if (blockedFields.has(key)) {
        return;
      }
      updates[key] = typeof req.body[key] === 'string' ? req.body[key].trim() : req.body[key];
    });

    // Handle image upload if file is provided
    if (req.file) {
      try {
        const imageUpload = await cloudinaryUploadImage(req.file);
        if (imageUpload?.secure_url) {
          updates.image = imageUpload.secure_url;
        }
      } catch (imageError) {
        console.log('Image upload error:', imageError);
        return res.json({ success: false, message: 'Failed to upload image: ' + imageError.message });
      }
    }

    if (!Object.keys(updates).length) {
      return res.json({ success: false, message: 'No editable fields provided' });
    }

    await CocicularModel.findByIdAndUpdate(userId, updates, { runValidators: true });
    return res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

export { getOwnProfile, updateOwnProfile };
