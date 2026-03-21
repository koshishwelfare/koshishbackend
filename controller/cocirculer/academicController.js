import { AcademicSession } from '../../models/class/academicSessionSchema.js';
import { Class } from '../../models/class/classSchema.js';
import MemberModel from '../../models/member/MemberSchema.js';

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

const getMentorsForClass = async (req, res) => {
  try {
    const filter = { role: 'mentor' };

    const mentors = await MemberModel.find(
      filter,
      { name: 1, email: 1, role: 1, isActive: 1, subject: 1, classTeacher: 1 }
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

    if (!name || !grade || !section || !sessionId || !mentorId) {
      return res.json({ success: false, message: 'name, grade, section, sessionId and mentorId are required' });
    }

    const [session, mentor] = await Promise.all([
      AcademicSession.findById(sessionId),
      MemberModel.findOne({ _id: mentorId, role: 'mentor' })
    ]);

    if (!session) {
      return res.json({ success: false, message: 'Session not found' });
    }

    if (!mentor) {
      return res.json({ success: false, message: 'Mentor not found' });
    }

    const normalizedSection = String(section).trim().toUpperCase();

    const normalizedTeacherIds = Array.isArray(teacherIds)
      ? [...new Set(teacherIds.map((id) => String(id)).filter(Boolean))]
      : String(teacherIds || '')
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean);

    if (normalizedTeacherIds.length) {
      const teachersCount = await MemberModel.countDocuments({
        _id: { $in: normalizedTeacherIds },
        role: 'mentor'
      });
      if (teachersCount !== normalizedTeacherIds.length) {
        return res.json({ success: false, message: 'One or more teacherIds are invalid' });
      }
    }

    const existing = await Class.findOne({ name, sessionId, grade, section: normalizedSection });
    if (existing) {
      return res.json({ success: false, message: 'Class already exists for this section in the session' });
    }

    const classData = await Class.create({
      name,
      grade,
      section: normalizedSection,
      sessionId,
      mentorId,
      teacherId: normalizedTeacherIds[0] || undefined,
      teacherIds: normalizedTeacherIds,
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
      .populate('mentorId', 'name email role subject classTeacher isActive')
      .populate('teacherId', 'username email')
      .populate('teacherIds', 'username email')
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
      .populate('mentorId', 'name email role subject classTeacher isActive')
      .populate('teacherId', 'username email')
      .populate('teacherIds', 'username email');

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

    const classDoc = await Class.findById(id);
    if (!classDoc) {
      return res.json({ success: false, message: 'Class not found' });
    }

    if (!name || !grade || !section || !sessionId || !mentorId) {
      return res.json({ success: false, message: 'name, grade, section, sessionId and mentorId are required' });
    }

    const [session, mentor] = await Promise.all([
      AcademicSession.findById(sessionId),
      MemberModel.findOne({ _id: mentorId, role: 'mentor' })
    ]);

    if (!session) {
      return res.json({ success: false, message: 'Session not found' });
    }

    if (!mentor) {
      return res.json({ success: false, message: 'Mentor not found' });
    }

    const normalizedSection = String(section).trim().toUpperCase();
    const normalizedTeacherIds = Array.isArray(teacherIds)
      ? [...new Set(teacherIds.map((tid) => String(tid)).filter(Boolean))]
      : String(teacherIds || '')
          .split(',')
          .map((tid) => tid.trim())
          .filter(Boolean);

    if (normalizedTeacherIds.length) {
      const teachersCount = await MemberModel.countDocuments({
        _id: { $in: normalizedTeacherIds },
        role: 'mentor'
      });
      if (teachersCount !== normalizedTeacherIds.length) {
        return res.json({ success: false, message: 'One or more teacherIds are invalid' });
      }
    }

    const duplicate = await Class.findOne({
      _id: { $ne: id },
      name: String(name).trim(),
      grade: String(grade).trim(),
      section: normalizedSection,
      sessionId
    });

    if (duplicate) {
      return res.json({ success: false, message: 'Class already exists for this section in the session' });
    }

    classDoc.name = String(name).trim();
    classDoc.grade = String(grade).trim();
    classDoc.section = normalizedSection;
    classDoc.sessionId = sessionId;
    classDoc.mentorId = mentorId;
    classDoc.teacherIds = normalizedTeacherIds;
    classDoc.teacherId = normalizedTeacherIds[0] || undefined;
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
  getMentorsForClass,
  createClass,
  getClasses,
  getClassById,
  updateClass
};
