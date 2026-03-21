import { DailyTeachingLog } from '../../models/teacher/dailyTeachingLogSchema.js';
import { TeacherAttendance } from '../../models/teacher/teacherAttendanceSchema.js';
import { Class } from '../../models/class/classSchema.js';

const isWorkingDay = (dateValue) => {
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }
  const day = parsed.getDay();
  return day >= 1 && day <= 5;
};

const upsertDailyTeachingLog = async (req, res) => {
  try {
    const teacherId = req.teacher?.userId;
    const {
      classId,
      date = new Date().toISOString().slice(0, 10),
      topic,
      summary = '',
      homework = '',
      nextPlan = '',
      durationMinutes = 0
    } = req.body;

    if (!teacherId || !classId || !topic) {
      return res.json({ success: false, message: 'classId and topic are required' });
    }

    if (!isWorkingDay(date)) {
      return res.json({ success: false, message: 'Daily teaching log can only be added on working days' });
    }

    const classData = await Class.findById(classId).select('_id');
    if (!classData) {
      return res.json({ success: false, message: 'Invalid classId' });
    }

    const teacherDay = await TeacherAttendance.findOne({ teacherId, date }).select('classId');
    if (!teacherDay) {
      return res.json({
        success: false,
        message: 'Mark your self-attendance first before adding daily teaching log.'
      });
    }

    if (String(teacherDay.classId || '') !== String(classId)) {
      return res.json({
        success: false,
        message: 'Daily teaching log is restricted to your selected class of the day.'
      });
    }

    const data = await DailyTeachingLog.findOneAndUpdate(
      { teacherId, classId, date },
      {
        teacherId,
        classId,
        date,
        topic,
        summary,
        homework,
        nextPlan,
        durationMinutes: Number(durationMinutes || 0)
      },
      { upsert: true, new: true, runValidators: true }
    );

    return res.json({ success: true, message: 'Daily teaching log saved successfully', data });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const getDailyTeachingLogs = async (req, res) => {
  try {
    const teacherId = req.teacher?.userId;
    const { classId, date } = req.query;

    const filter = {};
    if (teacherId) {
      filter.teacherId = teacherId;
    }
    if (classId) {
      filter.classId = classId;
    }
    if (date) {
      filter.date = date;
    }

    const data = await DailyTeachingLog.find(filter)
      .populate('teacherId', 'username email')
      .populate('classId', 'name grade section')
      .sort({ date: -1, createdAt: -1 });

    return res.json({ success: true, message: 'Daily teaching logs fetched successfully', data });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

export { upsertDailyTeachingLog, getDailyTeachingLogs };
