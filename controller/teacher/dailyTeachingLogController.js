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

const normalizeText = (value) => String(value || '').trim();

const findSubjectByName = (classData, subjectName) => {
  const normalized = normalizeText(subjectName).toLowerCase();
  if (!normalized) return null;

  return (classData.subjects || []).find(
    (subject) => normalizeText(subject.name).toLowerCase() === normalized
  ) || null;
};

const findChapterByTitle = (subject, chapterTitle) => {
  const normalized = normalizeText(chapterTitle).toLowerCase();
  if (!normalized) return null;

  return (subject?.chapters || []).find(
    (chapter) => normalizeText(chapter.title).toLowerCase() === normalized
  ) || null;
};

const upsertDailyTeachingLog = async (req, res) => {
  try {
    const teacherId = req.teacher?.userId;
    const {
      classId,
      date = new Date().toISOString().slice(0, 10),
      topic,
      subjectName = '',
      chapterTitle = '',
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
        subjectName: normalizeText(subjectName),
        chapterTitle: normalizeText(chapterTitle),
        summary,
        homework,
        nextPlan,
        durationMinutes: Number(durationMinutes || 0)
      },
      { upsert: true, new: true, runValidators: true }
    );

    let chapterUpdateMessage = null;
    if (subjectName && chapterTitle) {
      const fullClassData = await Class.findById(classId);
      const subject = findSubjectByName(fullClassData, subjectName);
      if (subject) {
        const chapter = findChapterByTitle(subject, chapterTitle);
        if (chapter) {
          chapter.isTaught = true;
          chapter.taughtAt = new Date();
          chapter.taughtBy = teacherId;
          chapter.taughtLogId = data._id;
          chapter.updatedAt = new Date();
          subject.updatedAt = new Date();
          await fullClassData.save();
          chapterUpdateMessage = 'Chapter marked as taught from daily teaching log';
        }
      }
    }

    return res.json({
      success: true,
      message: 'Daily teaching log saved successfully',
      data,
      chapterUpdateMessage
    });
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
