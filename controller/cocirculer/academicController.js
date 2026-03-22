import { AcademicSession } from '../../models/class/academicSessionSchema.js';
import { Class } from '../../models/class/classSchema.js';
import MemberModel from '../../models/member/MemberSchema.js';
import { MemberActivity } from '../../models/member/memberActivitySchema.js';
import { Student } from '../../models/student/studentSchema.js';
import mongoose from 'mongoose';
import { sendHolidayNotificationEmail } from '../../utils/mailer.js';

const normalizeId = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    if (value._id) return String(value._id).trim();
    if (value.id) return String(value.id).trim();
  }
  return String(value).trim();
};

const normalizeIdList = (value) => {
  if (Array.isArray(value)) {
    return [...new Set(value.map((id) => normalizeId(id)).filter(Boolean))];
  }
  return String(value || '')
    .split(',')
    .map((id) => normalizeId(id))
    .filter(Boolean);
};

const normalizeDateOnly = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const formatDateLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const notifyHolidayAudience = async ({ session, holiday, action = 'updated' }) => {
  try {
    if (!session?._id || !holiday) {
      return {
        students: { total: 0, emailed: 0 },
        mentors: { total: 0, emailed: 0, consoleNotified: 0 }
      };
    }

    const [students, mentors] = await Promise.all([
      Student.find({ sessionId: session._id }).select('_id name email').lean(),
      MemberModel.find({
        role: 'mentor',
        isActive: true,
        $or: [{ sessionId: session._id }, { sessionId: null }, { sessionId: { $exists: false } }]
      })
        .select('_id name email')
        .lean()
    ]);

    const holidayDate = formatDateLabel(holiday.date);
    let studentEmailSuccess = 0;
    let mentorEmailSuccess = 0;

    const studentEmailTasks = students
      .filter((row) => Boolean(String(row?.email || '').trim()))
      .map(async (student) => {
        const result = await sendHolidayNotificationEmail({
          to: student.email,
          recipientName: student.name,
          sessionName: session.name,
          holidayTitle: holiday.title,
          holidayDate,
          description: holiday.description,
          action
        });
        if (result?.sent) studentEmailSuccess += 1;
      });

    const mentorEmailTasks = mentors
      .filter((row) => Boolean(String(row?.email || '').trim()))
      .map(async (mentor) => {
        const result = await sendHolidayNotificationEmail({
          to: mentor.email,
          recipientName: mentor.name,
          sessionName: session.name,
          holidayTitle: holiday.title,
          holidayDate,
          description: holiday.description,
          action
        });
        if (result?.sent) mentorEmailSuccess += 1;
      });

    await Promise.all([...studentEmailTasks, ...mentorEmailTasks]);

    const mentorActivityPayload = mentors.map((mentor) => ({
      memberId: mentor._id,
      activityType: 'event',
      title: `Holiday Notice (${session.name}): ${holiday.title}`,
      description: `${action === 'deleted' ? 'Holiday removed' : `Holiday ${action}`}${holidayDate ? ` on ${holidayDate}` : ''}${holiday.description ? ` | ${holiday.description}` : ''}`,
      activityDate: new Date(),
      source: 'system'
    }));

    if (mentorActivityPayload.length) {
      await MemberActivity.insertMany(mentorActivityPayload, { ordered: false });
    }

    const summary = {
      students: { total: students.length, emailed: studentEmailSuccess },
      mentors: {
        total: mentors.length,
        emailed: mentorEmailSuccess,
        consoleNotified: mentorActivityPayload.length
      }
    };

    console.info(
      `[HolidayNotify] session=${session._id} action=${action} holiday=${holiday.title} students(email ${summary.students.emailed}/${summary.students.total}) mentors(email ${summary.mentors.emailed}/${summary.mentors.total}, console ${summary.mentors.consoleNotified})`
    );

    return summary;
  } catch (error) {
    console.log('[HolidayNotify] failed:', error.message);
    return {
      students: { total: 0, emailed: 0 },
      mentors: { total: 0, emailed: 0, consoleNotified: 0 },
      error: error.message
    };
  }
};

const addAcademicSession = async (req, res) => {
  try {
    const { name, startYear, endYear, isActive = true } = req.body;
    const currentYear = new Date().getFullYear();

    if (!name || !startYear || !endYear) {
      return res.json({ success: false, message: 'name, startYear and endYear are required' });
    }

    // Validate session name
    if (String(name).trim().length === 0) {
      return res.json({ success: false, message: 'Session name cannot be empty' });
    }

    // Validate year values
    const sYear = Number(startYear);
    const eYear = Number(endYear);

    if (isNaN(sYear) || isNaN(eYear)) {
      return res.json({ success: false, message: 'Start year and end year must be valid numbers' });
    }

    if (sYear < 1900 || sYear > currentYear + 10) {
      return res.json({ success: false, message: `Start year must be between 1900 and ${currentYear + 10}` });
    }

    if (eYear < 1900 || eYear > currentYear + 10) {
      return res.json({ success: false, message: `End year must be between 1900 and ${currentYear + 10}` });
    }

    if (sYear > eYear) {
      return res.json({ success: false, message: 'Start year cannot be greater than end year' });
    }

    const session = await AcademicSession.create({
      name: String(name).trim(),
      startYear: sYear,
      endYear: eYear,
      isActive: Boolean(isActive)
    });

    return res.json({ success: true, message: 'Session created successfully', data: session });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const getAcademicSessions = async (req, res) => {
  try {
    const data = await AcademicSession.find({}).sort({ startYear: -1 });
    return res.json({ success: true, data, message: 'Sessions fetched successfully' });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const getAcademicSessionById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await AcademicSession.findById(id);

    if (!data) {
      return res.json({ success: false, message: 'Session not found' });
    }

    return res.json({ success: true, data, message: 'Session fetched successfully' });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const updateAcademicSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, startYear, endYear, isActive } = req.body;
    const currentYear = new Date().getFullYear();

    const session = await AcademicSession.findById(id);
    if (!session) {
      return res.json({ success: false, message: 'Session not found' });
    }

    if (!name || !startYear || !endYear) {
      return res.json({ success: false, message: 'name, startYear and endYear are required' });
    }

    // Validate session name
    if (String(name).trim().length === 0) {
      return res.json({ success: false, message: 'Session name cannot be empty' });
    }

    // Validate year values
    const sYear = Number(startYear);
    const eYear = Number(endYear);

    if (isNaN(sYear) || isNaN(eYear)) {
      return res.json({ success: false, message: 'Start year and end year must be valid numbers' });
    }

    if (sYear < 1900 || sYear > currentYear + 10) {
      return res.json({ success: false, message: `Start year must be between 1900 and ${currentYear + 10}` });
    }

    if (eYear < 1900 || eYear > currentYear + 10) {
      return res.json({ success: false, message: `End year must be between 1900 and ${currentYear + 10}` });
    }

    if (sYear > eYear) {
      return res.json({ success: false, message: 'Start year cannot be greater than end year' });
    }

    const duplicate = await AcademicSession.findOne({
      name: String(name).trim(),
      _id: { $ne: id }
    });
    if (duplicate) {
      return res.json({ success: false, message: 'Session name already exists' });
    }

    session.name = String(name).trim();
    session.startYear = sYear;
    session.endYear = eYear;
    if (typeof isActive !== 'undefined') {
      session.isActive = Boolean(isActive);
    }

    await session.save();
    return res.json({ success: true, data: session, message: 'Session updated successfully' });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const listAcademicSessionHolidays = async (req, res) => {
  try {
    const { sessionId = '' } = req.query;
    const filter = {};

    if (sessionId) {
      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return res.json({ success: false, message: 'Invalid sessionId' });
      }
      filter._id = sessionId;
    }

    const sessions = await AcademicSession.find(filter)
      .select('_id name startYear endYear isActive holidays')
      .sort({ startYear: -1 });

    const holidays = sessions
      .flatMap((session) => (session.holidays || []).map((holiday) => ({
        _id: holiday._id,
        title: holiday.title,
        date: holiday.date,
        description: holiday.description || '',
        isActive: typeof holiday.isActive === 'boolean' ? holiday.isActive : true,
        session: {
          _id: session._id,
          name: session.name,
          startYear: session.startYear,
          endYear: session.endYear,
          isActive: session.isActive
        }
      })))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    return res.json({
      success: true,
      data: {
        sessions,
        holidays
      },
      message: 'Holidays fetched successfully'
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const addAcademicSessionHoliday = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { title, date, description = '', isActive = true } = req.body;

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.json({ success: false, message: 'Invalid sessionId' });
    }

    const normalizedTitle = String(title || '').trim();
    const normalizedDate = normalizeDateOnly(date);
    const normalizedDescription = String(description || '').trim();

    if (!normalizedTitle || !normalizedDate) {
      return res.json({ success: false, message: 'title and date are required' });
    }

    const session = await AcademicSession.findById(sessionId);
    if (!session) {
      return res.json({ success: false, message: 'Session not found' });
    }

    const exists = (session.holidays || []).some((holiday) => {
      return normalizeDateOnly(holiday.date) === normalizedDate &&
        String(holiday.title || '').trim().toLowerCase() === normalizedTitle.toLowerCase();
    });

    if (exists) {
      return res.json({ success: false, message: 'Holiday already exists for this date in selected session' });
    }

    session.holidays.push({
      title: normalizedTitle,
      date: new Date(normalizedDate),
      description: normalizedDescription,
      isActive: Boolean(isActive)
    });
    await session.save();

    const holiday = session.holidays[session.holidays.length - 1];
    const notifySummary = await notifyHolidayAudience({
      session,
      holiday,
      action: 'created'
    });

    return res.json({
      success: true,
      data: { holiday, notifications: notifySummary },
      message: `Holiday added successfully. Students emailed: ${notifySummary.students.emailed}/${notifySummary.students.total}, mentors emailed: ${notifySummary.mentors.emailed}/${notifySummary.mentors.total}.`
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const updateAcademicSessionHoliday = async (req, res) => {
  try {
    const { sessionId, holidayId } = req.params;
    const { title, date, description = '', isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(sessionId) || !mongoose.Types.ObjectId.isValid(holidayId)) {
      return res.json({ success: false, message: 'Invalid sessionId or holidayId' });
    }

    const session = await AcademicSession.findById(sessionId);
    if (!session) {
      return res.json({ success: false, message: 'Session not found' });
    }

    const holiday = (session.holidays || []).id(holidayId);
    if (!holiday) {
      return res.json({ success: false, message: 'Holiday not found' });
    }

    const normalizedTitle = typeof title === 'undefined' ? String(holiday.title || '').trim() : String(title || '').trim();
    const normalizedDate = typeof date === 'undefined' ? normalizeDateOnly(holiday.date) : normalizeDateOnly(date);

    if (!normalizedTitle || !normalizedDate) {
      return res.json({ success: false, message: 'title and date are required' });
    }

    const duplicate = (session.holidays || []).some((row) => {
      return String(row._id) !== String(holidayId)
        && normalizeDateOnly(row.date) === normalizedDate
        && String(row.title || '').trim().toLowerCase() === normalizedTitle.toLowerCase();
    });
    if (duplicate) {
      return res.json({ success: false, message: 'Holiday already exists for this date in selected session' });
    }

    holiday.title = normalizedTitle;
    holiday.date = new Date(normalizedDate);
    holiday.description = String(description ?? holiday.description ?? '').trim();
    if (typeof isActive !== 'undefined') {
      holiday.isActive = Boolean(isActive);
    }

    await session.save();

    const notifySummary = await notifyHolidayAudience({
      session,
      holiday,
      action: 'updated'
    });

    return res.json({
      success: true,
      data: { holiday, notifications: notifySummary },
      message: `Holiday updated successfully. Students emailed: ${notifySummary.students.emailed}/${notifySummary.students.total}, mentors emailed: ${notifySummary.mentors.emailed}/${notifySummary.mentors.total}.`
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const deleteAcademicSessionHoliday = async (req, res) => {
  try {
    const { sessionId, holidayId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(sessionId) || !mongoose.Types.ObjectId.isValid(holidayId)) {
      return res.json({ success: false, message: 'Invalid sessionId or holidayId' });
    }

    const session = await AcademicSession.findById(sessionId);
    if (!session) {
      return res.json({ success: false, message: 'Session not found' });
    }

    const holiday = (session.holidays || []).id(holidayId);
    if (!holiday) {
      return res.json({ success: false, message: 'Holiday not found' });
    }

    const holidaySnapshot = {
      title: holiday.title,
      date: holiday.date,
      description: holiday.description,
      isActive: holiday.isActive
    };

    holiday.deleteOne();
    await session.save();

    const notifySummary = await notifyHolidayAudience({
      session,
      holiday: holidaySnapshot,
      action: 'deleted'
    });

    return res.json({
      success: true,
      data: { notifications: notifySummary },
      message: `Holiday deleted successfully. Students emailed: ${notifySummary.students.emailed}/${notifySummary.students.total}, mentors emailed: ${notifySummary.mentors.emailed}/${notifySummary.mentors.total}.`
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const getMentorsForClass = async (req, res) => {
  try {
    const filter = { role: 'mentor' };

    const mentors = await MemberModel.find(
      filter,
      { name: 1, email: 1, role: 1, isActive: 1, classTeacher: 1 }
    )
      .sort({ name: 1 });

    return res.json({ success: true, data: mentors, message: 'Mentors fetched successfully' });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const createClass = async (req, res) => {
  try {
    const { name, grade, section = 'A', sessionId, mentorId, teacherIds = [] } = req.body;

    const normalizedName = String(name || '').trim();
    const normalizedGrade = String(grade || '').trim();
    const normalizedSection = String(section || 'A').trim().toUpperCase();
    const normalizedSessionId = normalizeId(sessionId);
    const normalizedMentorId = normalizeId(mentorId);
    const normalizedTeacherIds = normalizeIdList(teacherIds);
    const combinedTeacherIds = [...new Set([normalizedMentorId, ...normalizedTeacherIds].filter(Boolean))];

    if (!normalizedName || !normalizedGrade || !normalizedSection || !normalizedSessionId || !normalizedMentorId) {
      return res.json({ success: false, message: 'name, grade, section, sessionId and mentorId are required' });
    }

    if (!mongoose.Types.ObjectId.isValid(normalizedSessionId)) {
      return res.json({ success: false, message: 'Invalid sessionId' });
    }

    if (!mongoose.Types.ObjectId.isValid(normalizedMentorId)) {
      return res.json({ success: false, message: 'Invalid mentorId' });
    }

    const hasInvalidTeacherId = combinedTeacherIds.some((id) => !mongoose.Types.ObjectId.isValid(id));
    if (hasInvalidTeacherId) {
      return res.json({ success: false, message: 'One or more teacherIds are invalid' });
    }

    const [session, mentor] = await Promise.all([
      AcademicSession.findById(normalizedSessionId),
      MemberModel.findOne({ _id: normalizedMentorId, role: 'mentor' })
    ]);

    if (!session) {
      return res.json({ success: false, message: 'Session not found' });
    }

    if (!mentor) {
      return res.json({ success: false, message: 'Mentor not found' });
    }

    if (combinedTeacherIds.length) {
      const teachersCount = await MemberModel.countDocuments({
        _id: { $in: combinedTeacherIds },
        role: 'mentor'
      });
      if (teachersCount !== combinedTeacherIds.length) {
        return res.json({ success: false, message: 'One or more teacherIds are invalid' });
      }
    }

    const existing = await Class.findOne({
      name: normalizedName,
      grade: normalizedGrade,
      sessionId: normalizedSessionId,
      section: normalizedSection
    });
    if (existing) {
      return res.json({ success: false, message: 'Class already exists for this section in the session' });
    }

    const classData = await Class.create({
      name: normalizedName,
      grade: normalizedGrade,
      section: normalizedSection,
      sessionId: normalizedSessionId,
      mentorId: normalizedMentorId,
      teacherId: normalizedMentorId,
      teacherIds: combinedTeacherIds,
      isActive: true
    });

    return res.json({ success: true, message: 'Class created successfully', data: classData });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const getClasses = async (req, res) => {
  try {
    const { sessionId } = req.query;
    const filter = sessionId ? { sessionId } : {};

    const data = await Class.find(filter)
      .populate('sessionId', 'name startYear endYear')
      .populate('mentorId', 'name email role classTeacher isActive')
      .populate('teacherId', 'name username email role isActive')
      .populate('teacherIds', 'name username email role isActive')
      .sort({ createdAt: -1 });

    return res.json({ success: true, data, message: 'Classes fetched successfully' });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const getClassById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await Class.findById(id)
      .populate('sessionId', 'name startYear endYear')
      .populate('mentorId', 'name email role classTeacher isActive')
      .populate('teacherId', 'name username email role isActive')
      .populate('teacherIds', 'name username email role isActive');

    if (!data) {
      return res.json({ success: false, message: 'Class not found' });
    }

    return res.json({ success: true, data, message: 'Class fetched successfully' });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, grade, section = 'A', sessionId, mentorId, teacherIds = [], isActive } = req.body;

    const normalizedName = String(name || '').trim();
    const normalizedGrade = String(grade || '').trim();
    const normalizedSection = String(section || 'A').trim().toUpperCase();
    const normalizedSessionId = normalizeId(sessionId);
    const normalizedMentorId = normalizeId(mentorId);
    const normalizedTeacherIds = normalizeIdList(teacherIds);
    const combinedTeacherIds = [...new Set([normalizedMentorId, ...normalizedTeacherIds].filter(Boolean))];

    const classDoc = await Class.findById(id);
    if (!classDoc) {
      return res.json({ success: false, message: 'Class not found' });
    }

    if (!normalizedName || !normalizedGrade || !normalizedSection || !normalizedSessionId || !normalizedMentorId) {
      return res.json({ success: false, message: 'name, grade, section, sessionId and mentorId are required' });
    }

    if (!mongoose.Types.ObjectId.isValid(normalizedSessionId)) {
      return res.json({ success: false, message: 'Invalid sessionId' });
    }

    if (!mongoose.Types.ObjectId.isValid(normalizedMentorId)) {
      return res.json({ success: false, message: 'Invalid mentorId' });
    }

    const hasInvalidTeacherId = combinedTeacherIds.some((tid) => !mongoose.Types.ObjectId.isValid(tid));
    if (hasInvalidTeacherId) {
      return res.json({ success: false, message: 'One or more teacherIds are invalid' });
    }

    const [session, mentor] = await Promise.all([
      AcademicSession.findById(normalizedSessionId),
      MemberModel.findOne({ _id: normalizedMentorId, role: 'mentor' })
    ]);

    if (!session) {
      return res.json({ success: false, message: 'Session not found' });
    }

    if (!mentor) {
      return res.json({ success: false, message: 'Mentor not found' });
    }

    if (combinedTeacherIds.length) {
      const teachersCount = await MemberModel.countDocuments({
        _id: { $in: combinedTeacherIds },
        role: 'mentor'
      });
      if (teachersCount !== combinedTeacherIds.length) {
        return res.json({ success: false, message: 'One or more teacherIds are invalid' });
      }
    }

    const duplicate = await Class.findOne({
      _id: { $ne: id },
      name: normalizedName,
      grade: normalizedGrade,
      section: normalizedSection,
      sessionId: normalizedSessionId
    });

    if (duplicate) {
      return res.json({ success: false, message: 'Class already exists for this section in the session' });
    }

    classDoc.name = normalizedName;
    classDoc.grade = normalizedGrade;
    classDoc.section = normalizedSection;
    classDoc.sessionId = normalizedSessionId;
    classDoc.mentorId = normalizedMentorId;
    classDoc.teacherIds = combinedTeacherIds;
    classDoc.teacherId = normalizedMentorId;
    if (typeof isActive !== 'undefined') {
      classDoc.isActive = Boolean(isActive);
    }

    await classDoc.save();
    return res.json({ success: true, data: classDoc, message: 'Class updated successfully' });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

export {
  addAcademicSession,
  getAcademicSessions,
  getAcademicSessionById,
  updateAcademicSession,
  listAcademicSessionHolidays,
  addAcademicSessionHoliday,
  updateAcademicSessionHoliday,
  deleteAcademicSessionHoliday,
  getMentorsForClass,
  createClass,
  getClasses,
  getClassById,
  updateClass
};
