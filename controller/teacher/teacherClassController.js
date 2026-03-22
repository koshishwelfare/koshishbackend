import { Class } from '../../models/class/classSchema.js';
import { TeacherAttendance } from '../../models/teacher/teacherAttendanceSchema.js';

const getMyClasses = async (req, res) => {
  try {
    const teacherId = req.teacher?.userId;
    if (!teacherId) {
      return res.json({ success: false, message: 'Teacher authentication required' });
    }

    const directClasses = await Class.find({
      isActive: true,
      $or: [{ teacherId }, { teacherIds: teacherId }, { mentorId: teacherId }]
    })
      .select('_id name grade section sessionId')
      .populate('sessionId', 'name startYear endYear')
      .sort({ grade: 1, section: 1, name: 1 });

    if (directClasses.length) {
      return res.json({ success: true, message: 'Teacher classes fetched successfully', data: directClasses });
    }

    const attendedClassIds = await TeacherAttendance.distinct('classId', { teacherId, classId: { $ne: null } });
    const fallbackClasses = attendedClassIds.length
      ? await Class.find({ _id: { $in: attendedClassIds }, isActive: true })
          .select('_id name grade section sessionId')
          .populate('sessionId', 'name startYear endYear')
          .sort({ grade: 1, section: 1, name: 1 })
      : [];

    return res.json({ success: true, message: 'Teacher classes fetched successfully', data: fallbackClasses });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

export { getMyClasses };
