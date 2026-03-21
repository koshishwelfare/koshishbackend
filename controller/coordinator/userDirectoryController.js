import MemberModel from '../../models/member/MemberSchema.js';
import { Student } from '../../models/student/studentSchema.js';
import CocicularModel from '../../models/Cocirculer/cocerculerProfile.js';
import { AcademicSession } from '../../models/class/academicSessionSchema.js';
import { Class } from '../../models/class/classSchema.js';
import { homeEventsModel } from '../../models/Events/eventsSchema.js';
import { Announcement } from '../../models/App/announcementSchema.js';
import { GalleryModel } from '../../models/Gallary/gallerySchema.js';

const buildPagination = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: Math.max(Math.ceil(total / limit), 1)
});

const listMembersForCoordinator = async (req, res) => {
  try {
    const {
      q = '',
      role = '',
      isActive = '',
      sortBy = 'joinTime',
      sortOrder = 'desc',
      page = 1,
      limit = 10
    } = req.query;

    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);

    const filter = {};
    if (role) filter.role = role;
    if (isActive === 'true') filter.isActive = true;
    if (isActive === 'false') filter.isActive = false;

    const trimmedQ = String(q || '').trim();
    if (trimmedQ) {
      const regex = new RegExp(trimmedQ, 'i');
      filter.$or = [
        { name: regex },
        { email: regex },
        { username: regex },
        { phoneNumber: regex },
        { subject: regex },
        { speciality: regex },
        { role: regex }
      ];
    }

    const allowedSort = new Set(['joinTime', 'createdAt', 'name', 'email', 'role', 'isActive']);
    const safeSortBy = allowedSort.has(sortBy) ? sortBy : 'joinTime';
    const safeSortOrder = String(sortOrder).toLowerCase() === 'asc' ? 1 : -1;

    const [records, total] = await Promise.all([
      MemberModel.find(filter, { password: 0 })
        .populate('sessionId', 'name startYear endYear')
        .sort({ [safeSortBy]: safeSortOrder })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit),
      MemberModel.countDocuments(filter)
    ]);

    return res.json({
      success: true,
      records,
      pagination: buildPagination(safePage, safeLimit, total)
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const listStudentsForCoordinator = async (req, res) => {
  try {
    const {
      q = '',
      classId = '',
      sessionId = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10
    } = req.query;

    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);

    const filter = {};
    if (classId) filter.classId = classId;
    if (sessionId) filter.sessionId = sessionId;

    const trimmedQ = String(q || '').trim();
    if (trimmedQ) {
      const regex = new RegExp(trimmedQ, 'i');
      filter.$or = [
        { name: regex },
        { username: regex },
        { email: regex },
        { registrationNumber: regex },
        { rollNumber: regex },
        { phoneNumber: regex },
        { course: regex }
      ];
    }

    const allowedSort = new Set(['createdAt', 'name', 'username', 'email', 'registrationNumber', 'rollNumber']);
    const safeSortBy = allowedSort.has(sortBy) ? sortBy : 'createdAt';
    const safeSortOrder = String(sortOrder).toLowerCase() === 'asc' ? 1 : -1;

    const [records, total] = await Promise.all([
      Student.find(filter, { password: 0 })
        .populate('classId', 'name grade section')
        .populate('sessionId', 'name startYear endYear')
        .sort({ [safeSortBy]: safeSortOrder })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit),
      Student.countDocuments(filter)
    ]);

    return res.json({
      success: true,
      records,
      pagination: buildPagination(safePage, safeLimit, total)
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const listSessionsForCoordinator = async (req, res) => {
  try {
    const {
      q = '',
      isActive = '',
      startYear = '',
      endYear = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10
    } = req.query;

    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);

    const filter = {};
    if (isActive === 'true') filter.isActive = true;
    if (isActive === 'false') filter.isActive = false;

    const parsedStartYear = Number(startYear);
    const parsedEndYear = Number(endYear);
    if (!Number.isNaN(parsedStartYear) && startYear !== '') {
      filter.startYear = parsedStartYear;
    }
    if (!Number.isNaN(parsedEndYear) && endYear !== '') {
      filter.endYear = parsedEndYear;
    }

    const trimmedQ = String(q || '').trim();
    if (trimmedQ) {
      const regex = new RegExp(trimmedQ, 'i');
      filter.$or = [{ name: regex }];
    }

    const allowedSort = new Set(['createdAt', 'updatedAt', 'name', 'startYear', 'endYear', 'isActive']);
    const safeSortBy = allowedSort.has(sortBy) ? sortBy : 'createdAt';
    const safeSortOrder = String(sortOrder).toLowerCase() === 'asc' ? 1 : -1;

    const [records, total] = await Promise.all([
      AcademicSession.find(filter)
        .sort({ [safeSortBy]: safeSortOrder })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit),
      AcademicSession.countDocuments(filter)
    ]);

    return res.json({
      success: true,
      records,
      pagination: buildPagination(safePage, safeLimit, total)
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const listSessionClassesForCoordinator = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const {
      q = '',
      grade = '',
      section = '',
      isActive = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10
    } = req.query;

    if (!sessionId) {
      return res.json({ success: false, message: 'sessionId is required' });
    }

    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);

    const filter = { sessionId };
    if (grade) filter.grade = String(grade).trim();
    if (section) filter.section = String(section).trim().toUpperCase();
    if (isActive === 'true') filter.isActive = true;
    if (isActive === 'false') filter.isActive = false;

    const trimmedQ = String(q || '').trim();
    if (trimmedQ) {
      const regex = new RegExp(trimmedQ, 'i');
      filter.$or = [{ name: regex }, { grade: regex }, { section: regex }];
    }

    const allowedSort = new Set(['createdAt', 'updatedAt', 'name', 'grade', 'section', 'isActive']);
    const safeSortBy = allowedSort.has(sortBy) ? sortBy : 'createdAt';
    const safeSortOrder = String(sortOrder).toLowerCase() === 'asc' ? 1 : -1;

    const [records, total, session] = await Promise.all([
      Class.find(filter)
        .populate('sessionId', 'name startYear endYear isActive')
        .populate('mentorId', 'name email role subject classTeacher isActive')
        .populate('teacherId', 'username email')
        .populate('teacherIds', 'username email')
        .sort({ [safeSortBy]: safeSortOrder })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit),
      Class.countDocuments(filter),
      AcademicSession.findById(sessionId).select('name startYear endYear isActive')
    ]);

    return res.json({
      success: true,
      session,
      records,
      pagination: buildPagination(safePage, safeLimit, total)
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const listEventsForCoordinator = async (req, res) => {
  try {
    const {
      q = '',
      isActive = '',
      registrationOpen = '',
      sortBy = 'startdate',
      sortOrder = 'desc',
      page = 1,
      limit = 10
    } = req.query;

    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);

    const filter = {};
    if (isActive === 'true') filter.isActive = true;
    if (isActive === 'false') filter.isActive = false;
    if (registrationOpen === 'true') filter.registrationOpen = true;
    if (registrationOpen === 'false') filter.registrationOpen = false;

    const trimmedQ = String(q || '').trim();
    if (trimmedQ) {
      const regex = new RegExp(trimmedQ, 'i');
      filter.$or = [{ name: regex }, { desc: regex }];
    }

    const allowedSort = new Set(['startdate', 'endDate', 'name', 'isActive', 'registrationOpen']);
    const safeSortBy = allowedSort.has(sortBy) ? sortBy : 'startdate';
    const safeSortOrder = String(sortOrder).toLowerCase() === 'asc' ? 1 : -1;

    const [records, total] = await Promise.all([
      homeEventsModel.find(filter)
        .sort({ [safeSortBy]: safeSortOrder })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit),
      homeEventsModel.countDocuments(filter)
    ]);

    return res.json({
      success: true,
      records,
      pagination: buildPagination(safePage, safeLimit, total)
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const listNewsForCoordinator = async (req, res) => {
  try {
    const {
      q = '',
      isAtive = '',
      sortBy = 'date',
      sortOrder = 'desc',
      page = 1,
      limit = 10
    } = req.query;

    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);

    const filter = {};
    if (isAtive === 'true') filter.isAtive = true;
    if (isAtive === 'false') filter.isAtive = false;

    const trimmedQ = String(q || '').trim();
    if (trimmedQ) {
      const regex = new RegExp(trimmedQ, 'i');
      filter.$or = [{ heading: regex }, { announcement: regex }];
    }

    const allowedSort = new Set(['date', 'heading', 'isAtive']);
    const safeSortBy = allowedSort.has(sortBy) ? sortBy : 'date';
    const safeSortOrder = String(sortOrder).toLowerCase() === 'asc' ? 1 : -1;

    const [records, total] = await Promise.all([
      Announcement.find(filter)
        .sort({ [safeSortBy]: safeSortOrder })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit),
      Announcement.countDocuments(filter)
    ]);

    return res.json({
      success: true,
      records,
      pagination: buildPagination(safePage, safeLimit, total)
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const listGalleryForCoordinator = async (req, res) => {
  try {
    const {
      q = '',
      isActive = '',
      isNews = '',
      sortBy = 'date',
      sortOrder = 'desc',
      page = 1,
      limit = 10
    } = req.query;

    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);

    const filter = {};
    if (isActive === 'true') filter.isActive = true;
    if (isActive === 'false') filter.isActive = false;
    if (isNews === 'true') filter.isNews = true;
    if (isNews === 'false') filter.isNews = false;

    const trimmedQ = String(q || '').trim();
    if (trimmedQ) {
      const regex = new RegExp(trimmedQ, 'i');
      filter.$or = [{ galleryTitle: regex }, { galleryDescription: regex }];
    }

    const allowedSort = new Set(['date', 'galleryTitle', 'isActive', 'isNews']);
    const safeSortBy = allowedSort.has(sortBy) ? sortBy : 'date';
    const safeSortOrder = String(sortOrder).toLowerCase() === 'asc' ? 1 : -1;

    const [records, total] = await Promise.all([
      GalleryModel.find(filter)
        .select('galleryTitle galleryDescription thumbnail date isNews isActive')
        .sort({ [safeSortBy]: safeSortOrder })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit),
      GalleryModel.countDocuments(filter)
    ]);

    return res.json({
      success: true,
      records,
      pagination: buildPagination(safePage, safeLimit, total)
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const getCocircularProfileByIdForCoordinator = async (req, res) => {
  try {
    const { id } = req.params;
    const profile = await CocicularModel.findById(id).select('-password');
    if (!profile) {
      return res.json({ success: false, message: 'Co-curricular profile not found' });
    }
    return res.json({ success: true, data: profile });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const getTeacherProfileByIdForCoordinator = async (req, res) => {
  try {
    const { id } = req.params;
    const profile = await MemberModel.findById(id, { password: 0 }).populate('sessionId', 'name startYear endYear');
    if (!profile) {
      return res.json({ success: false, message: 'Teacher profile not found' });
    }
    return res.json({ success: true, data: profile });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const getStudentProfileByIdForCoordinator = async (req, res) => {
  try {
    const { id } = req.params;
    const profile = await Student.findById(id, { password: 0 })
      .populate('classId', 'name grade section')
      .populate('sessionId', 'name startYear endYear');
    if (!profile) {
      return res.json({ success: false, message: 'Student profile not found' });
    }
    return res.json({ success: true, data: profile });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

export {
  listMembersForCoordinator,
  listStudentsForCoordinator,
  listSessionsForCoordinator,
  listSessionClassesForCoordinator,
  listEventsForCoordinator,
  listNewsForCoordinator,
  listGalleryForCoordinator,
  getCocircularProfileByIdForCoordinator,
  getTeacherProfileByIdForCoordinator,
  getStudentProfileByIdForCoordinator
};
