import MemberModel from '../../models/member/MemberSchema.js';
import bcrypt from 'bcrypt';
import { cloudinaryUploadImage } from '../../middleware/cloudimage/cloudinary.js';

const sanitizeTeacher = (teacherDoc) => ({
  _id: teacherDoc._id,
  name: teacherDoc.name || '',
  username: teacherDoc.username,
  email: teacherDoc.email,
  phoneNumber: teacherDoc.phoneNumber || '',
  profileImage: teacherDoc.profileImage || teacherDoc.image || '',
  bio: teacherDoc.bio || '',
  linkedinUrl: teacherDoc.linkedinUrl || teacherDoc.linkedin || '',
  instagramUrl: teacherDoc.instagramUrl || '',
  facebookUrl: teacherDoc.facebookUrl || '',
  youtubeUrl: teacherDoc.youtubeUrl || '',
  websiteUrl: teacherDoc.websiteUrl || '',
  subject: teacherDoc.subject || '',
  classTeacher: teacherDoc.classTeacher || '',
  speciality: teacherDoc.speciality || '',
  quote: teacherDoc.quote || '',
  aboutHead: teacherDoc.aboutHead || '',
  yog: teacherDoc.yog ?? null,
  about: teacherDoc.about || '',
  role: teacherDoc.role,
  sessionId: teacherDoc.sessionId,
  isActive: teacherDoc.isActive,
  createdAt: teacherDoc.createdAt,
  updatedAt: teacherDoc.updatedAt
});

const getTeacherProfile = async (req, res) => {
  try {
    const teacherId = req.teacher?.userId;
    const teacher = await MemberModel.findOne({ _id: teacherId, role: 'mentor' });

    if (!teacher) {
      return res.json({ success: false, message: 'Teacher not found' });
    }

    return res.json({
      success: true,
      message: 'Teacher profile fetched successfully',
      teacher: sanitizeTeacher(teacher)
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const updateTeacherProfile = async (req, res) => {
  try {
    const teacherId = req.teacher?.userId;
    const allowedFields = [
      'name',
      'phoneNumber',
      'profileImage',
      'bio',
      'linkedinUrl',
      'instagramUrl',
      'facebookUrl',
      'youtubeUrl',
      'websiteUrl',
      'subject',
      'classTeacher',
      'speciality',
      'quote',
      'aboutHead',
      'yog',
      'about'
    ];
    const updateData = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    if (updateData.linkedinUrl !== undefined && updateData.linkedin === undefined) {
      updateData.linkedin = updateData.linkedinUrl;
    }

    if (updateData.profileImage !== undefined && updateData.image === undefined) {
      updateData.image = updateData.profileImage;
    }

    if (req.file) {
      const imageUpload = await cloudinaryUploadImage(req.file);
      if (imageUpload?.secure_url) {
        updateData.profileImage = imageUpload.secure_url;
        updateData.image = imageUpload.secure_url;
      }
    }

    const teacher = await MemberModel.findOneAndUpdate({ _id: teacherId, role: 'mentor' }, updateData, {
      new: true,
      runValidators: true
    });

    if (!teacher) {
      return res.json({ success: false, message: 'Teacher not found' });
    }

    return res.json({
      success: true,
      message: 'Teacher profile updated successfully',
      teacher: sanitizeTeacher(teacher)
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const updateTeacherPassword = async (req, res) => {
  try {
    const teacherId = req.teacher?.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.json({ success: false, message: 'currentPassword and newPassword are required' });
    }

    if (String(newPassword).length < 8) {
      return res.json({ success: false, message: 'New password must be at least 8 characters long' });
    }

    const teacher = await MemberModel.findOne({ _id: teacherId, role: 'mentor' });
    if (!teacher) {
      return res.json({ success: false, message: 'Teacher not found' });
    }

    const isCurrentValid = await bcrypt.compare(String(currentPassword), String(teacher.password));
    if (!isCurrentValid) {
      return res.json({ success: false, message: 'Current password is incorrect' });
    }

    teacher.password = await bcrypt.hash(String(newPassword), 10);
    await teacher.save();

    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

export { getTeacherProfile, updateTeacherProfile, updateTeacherPassword };
