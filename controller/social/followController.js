import MemberModel from '../../models/member/MemberSchema.js';
import { Follow } from '../../models/member/followSchema.js';
import { MemberActivity } from '../../models/member/memberActivitySchema.js';

const parsePositiveInt = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return parsed;
};

const getTargetTeacher = async (teacherId) => {
  if (!teacherId) return null;
  return MemberModel.findById(teacherId).select('_id role name email image');
};

const studentFollowTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const targetTeacher = await getTargetTeacher(teacherId);

    if (!targetTeacher) {
      return res.json({ success: false, message: 'Teacher profile not found' });
    }

    await Follow.findOneAndUpdate(
      { followerStudentId: req.studentId, followingTeacherId: teacherId },
      {
        $setOnInsert: {
          followerStudentId: req.studentId,
          followingTeacherId: teacherId
        }
      },
      { upsert: true, new: true }
    );

    return res.json({
      success: true,
      message: `You are now following ${targetTeacher.name}`
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const studentUnfollowTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;
    await Follow.deleteOne({ followerStudentId: req.studentId, followingTeacherId: teacherId });

    return res.json({ success: true, message: 'Unfollowed successfully' });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const listStudentFollowing = async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 20);
    const skip = (page - 1) * limit;

    const filter = { followerStudentId: req.studentId };
    const [total, data] = await Promise.all([
      Follow.countDocuments(filter),
      Follow.find(filter)
        .populate('followingTeacherId', 'name image role speciality yog isActive')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
    ]);

    return res.json({
      success: true,
      message: 'Following list fetched successfully',
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const teacherFollowTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const followerTeacherId = req.teacher?.userId;

    if (!followerTeacherId) {
      return res.json({ success: false, message: 'Invalid teacher session' });
    }

    if (String(followerTeacherId) === String(teacherId)) {
      return res.json({ success: false, message: 'Teacher cannot follow self' });
    }

    const targetTeacher = await getTargetTeacher(teacherId);
    if (!targetTeacher) {
      return res.json({ success: false, message: 'Teacher profile not found' });
    }

    await Follow.findOneAndUpdate(
      { followerTeacherId, followingTeacherId: teacherId },
      {
        $setOnInsert: {
          followerTeacherId,
          followingTeacherId: teacherId
        }
      },
      { upsert: true, new: true }
    );

    return res.json({
      success: true,
      message: `You are now following ${targetTeacher.name}`
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const teacherUnfollowTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const followerTeacherId = req.teacher?.userId;

    if (!followerTeacherId) {
      return res.json({ success: false, message: 'Invalid teacher session' });
    }

    await Follow.deleteOne({ followerTeacherId, followingTeacherId: teacherId });
    return res.json({ success: true, message: 'Unfollowed successfully' });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const listTeacherFollowing = async (req, res) => {
  try {
    const followerTeacherId = req.teacher?.userId;
    if (!followerTeacherId) {
      return res.json({ success: false, message: 'Invalid teacher session' });
    }

    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 20);
    const skip = (page - 1) * limit;

    const filter = { followerTeacherId };
    const [total, data] = await Promise.all([
      Follow.countDocuments(filter),
      Follow.find(filter)
        .populate('followingTeacherId', 'name image role speciality yog isActive')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
    ]);

    return res.json({
      success: true,
      message: 'Following list fetched successfully',
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const teacherAddProfileActivity = async (req, res) => {
  try {
    const memberId = req.teacher?.userId;
    if (!memberId) {
      return res.json({ success: false, message: 'Invalid teacher session' });
    }

    const {
      activityType,
      title,
      description = '',
      activityDate
    } = req.body;

    if (!activityType || !title) {
      return res.json({ success: false, message: 'activityType and title are required' });
    }

    const data = await MemberActivity.create({
      memberId,
      activityType,
      title,
      description,
      activityDate: activityDate ? new Date(activityDate) : new Date(),
      source: 'manual'
    });

    return res.json({
      success: true,
      message: 'Profile activity added successfully',
      data
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

export {
  studentFollowTeacher,
  studentUnfollowTeacher,
  listStudentFollowing,
  teacherFollowTeacher,
  teacherUnfollowTeacher,
  listTeacherFollowing,
  teacherAddProfileActivity
};
