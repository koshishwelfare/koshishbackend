import mongoose from 'mongoose';
import { Class } from '../../models/class/classSchema.js';
import { Student } from '../../models/student/studentSchema.js';

const normalizeText = (value) => String(value || '').trim();

const isTeacherAssignedToClass = (classData, teacherId) => {
  if (!classData || !teacherId) return false;

  const teacherIdText = String(teacherId);
  const classTeacherIds = Array.isArray(classData.teacherIds)
    ? classData.teacherIds.map((id) => String(id))
    : [];

  return (
    (classData.mentorId && String(classData.mentorId) === teacherIdText) ||
    (classData.teacherId && String(classData.teacherId) === teacherIdText) ||
    classTeacherIds.includes(teacherIdText)
  );
};

const getClassWithAuthorization = async (classId, teacherId) => {
  const classData = await Class.findById(classId);
  if (!classData) {
    return { error: 'Invalid classId' };
  }

  const isAssigned = isTeacherAssignedToClass(classData, teacherId);
  if ((classData.mentorId || classData.teacherId || (classData.teacherIds || []).length) && !isAssigned) {
    return { error: 'You are not assigned to this class' };
  }

  if (teacherId && !isAssigned) {
    classData.teacherIds = [...(classData.teacherIds || []), teacherId];
  }

  if (!classData.teacherId && teacherId) {
    classData.teacherId = teacherId;
  }

  return { classData };
};

const sanitizeCurriculum = (classData) => {
  const subjects = (classData.subjects || []).map((subject) => ({
    _id: subject._id,
    name: subject.name,
    description: subject.description,
    addedBy: subject.addedBy,
    createdAt: subject.createdAt,
    updatedAt: subject.updatedAt,
    chapters: (subject.chapters || []).map((chapter) => ({
      _id: chapter._id,
      title: chapter.title,
      description: chapter.description,
      isTaught: chapter.isTaught,
      taughtAt: chapter.taughtAt,
      taughtBy: chapter.taughtBy,
      taughtLogId: chapter.taughtLogId,
      createdAt: chapter.createdAt,
      updatedAt: chapter.updatedAt
    }))
  }));

  return {
    class: {
      _id: classData._id,
      name: classData.name,
      grade: classData.grade,
      section: classData.section
    },
    subjects
  };
};

const getNextRollNumber = async (classId, sessionId) => {
  const count = await Student.countDocuments({ classId, sessionId });
  return `R-${String(count + 1).padStart(3, '0')}`;
};

const addClassSubject = async (req, res) => {
  try {
    const teacherId = req.teacher?.userId;
    const { classId } = req.params;
    const { subjectName, description = '' } = req.body;

    if (!teacherId) {
      return res.json({ success: false, message: 'Teacher authentication required' });
    }

    const normalizedSubjectName = normalizeText(subjectName);
    if (!normalizedSubjectName) {
      return res.json({ success: false, message: 'subjectName is required' });
    }

    const { classData, error } = await getClassWithAuthorization(classId, teacherId);
    if (error) {
      return res.json({ success: false, message: error });
    }

    const duplicate = (classData.subjects || []).some(
      (subject) => String(subject.name || '').toLowerCase() === normalizedSubjectName.toLowerCase()
    );

    if (duplicate) {
      return res.json({ success: false, message: 'Subject already exists in this class' });
    }

    classData.subjects.push({
      name: normalizedSubjectName,
      description: normalizeText(description),
      addedBy: teacherId,
      chapters: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await classData.save();

    return res.json({
      success: true,
      message: 'Subject added successfully',
      data: sanitizeCurriculum(classData)
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const addClassChapter = async (req, res) => {
  try {
    const teacherId = req.teacher?.userId;
    const { classId, subjectId } = req.params;
    const { chapterTitle, description = '' } = req.body;

    if (!teacherId) {
      return res.json({ success: false, message: 'Teacher authentication required' });
    }

    const normalizedChapterTitle = normalizeText(chapterTitle);
    if (!normalizedChapterTitle) {
      return res.json({ success: false, message: 'chapterTitle is required' });
    }

    const { classData, error } = await getClassWithAuthorization(classId, teacherId);
    if (error) {
      return res.json({ success: false, message: error });
    }

    const subject = classData.subjects.id(subjectId);
    if (!subject) {
      return res.json({ success: false, message: 'Invalid subjectId' });
    }

    const duplicate = (subject.chapters || []).some(
      (chapter) => String(chapter.title || '').toLowerCase() === normalizedChapterTitle.toLowerCase()
    );

    if (duplicate) {
      return res.json({ success: false, message: 'Chapter already exists in this subject' });
    }

    subject.chapters.push({
      title: normalizedChapterTitle,
      description: normalizeText(description),
      isTaught: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    subject.updatedAt = new Date();

    await classData.save();

    return res.json({
      success: true,
      message: 'Chapter added successfully',
      data: sanitizeCurriculum(classData)
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const markClassChapterTaught = async (req, res) => {
  try {
    const teacherId = req.teacher?.userId;
    const { classId, subjectId, chapterId } = req.params;
    const {
      isTaught = true,
      taughtAt,
      taughtLogId = null,
      notes = ''
    } = req.body;

    if (!teacherId) {
      return res.json({ success: false, message: 'Teacher authentication required' });
    }

    const { classData, error } = await getClassWithAuthorization(classId, teacherId);
    if (error) {
      return res.json({ success: false, message: error });
    }

    const subject = classData.subjects.id(subjectId);
    if (!subject) {
      return res.json({ success: false, message: 'Invalid subjectId' });
    }

    const chapter = subject.chapters.id(chapterId);
    if (!chapter) {
      return res.json({ success: false, message: 'Invalid chapterId' });
    }

    const taughtDate = taughtAt ? new Date(taughtAt) : new Date();
    if (Number.isNaN(taughtDate.getTime())) {
      return res.json({ success: false, message: 'Invalid taughtAt value' });
    }

    chapter.isTaught = Boolean(isTaught);
    chapter.taughtAt = chapter.isTaught ? taughtDate : null;
    chapter.taughtBy = chapter.isTaught ? teacherId : null;
    chapter.taughtLogId = chapter.isTaught && taughtLogId && mongoose.Types.ObjectId.isValid(taughtLogId)
      ? taughtLogId
      : null;

    if (notes) {
      const noteText = normalizeText(notes);
      chapter.description = chapter.description
        ? `${chapter.description} | ${noteText}`
        : noteText;
    }

    chapter.updatedAt = new Date();
    subject.updatedAt = new Date();

    await classData.save();

    return res.json({
      success: true,
      message: chapter.isTaught ? 'Chapter marked as taught' : 'Chapter marked as not taught',
      data: sanitizeCurriculum(classData)
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const getClassCurriculum = async (req, res) => {
  try {
    const teacherId = req.teacher?.userId;
    const { classId } = req.params;

    if (!teacherId) {
      return res.json({ success: false, message: 'Teacher authentication required' });
    }

    const { classData, error } = await getClassWithAuthorization(classId, teacherId);
    if (error) {
      return res.json({ success: false, message: error });
    }

    return res.json({
      success: true,
      message: 'Class curriculum fetched successfully',
      data: sanitizeCurriculum(classData)
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const listAvailableStudentsForClass = async (req, res) => {
  try {
    const teacherId = req.teacher?.userId;
    const { classId } = req.params;
    const {
      search = '',
      page = 1,
      limit = 10,
      includeMapped = 'false'
    } = req.query || {};

    if (!teacherId) {
      return res.json({ success: false, message: 'Teacher authentication required' });
    }

    const { classData, error } = await getClassWithAuthorization(classId, teacherId);
    if (error) {
      return res.json({ success: false, message: error });
    }

    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const safeSearch = normalizeText(search);
    const shouldIncludeMapped = String(includeMapped).toLowerCase() === 'true';

    const baseFilter = {
      $or: [
        { sessionId: classData.sessionId },
        { sessionId: null },
        { sessionId: { $exists: false } }
      ]
    };

    const availabilityFilter = shouldIncludeMapped
      ? { classId: { $ne: classData._id } }
      : {
          $or: [
            { classId: null },
            { classId: { $exists: false } }
          ]
        };

    const filter = {
      ...baseFilter,
      ...availabilityFilter
    };

    if (safeSearch) {
      const searchFilter = {
        $or: [
        { name: { $regex: safeSearch, $options: 'i' } },
        { username: { $regex: safeSearch, $options: 'i' } },
        { email: { $regex: safeSearch, $options: 'i' } },
        { rollNumber: { $regex: safeSearch, $options: 'i' } },
        { registrationNumber: { $regex: safeSearch, $options: 'i' } }
        ]
      };

      const withoutSearch = { ...filter };
      delete withoutSearch.$or;

      if (shouldIncludeMapped) {
        filter.$and = [withoutSearch, searchFilter];
        delete filter.classId;
      } else {
        filter.$and = [
          withoutSearch,
          availabilityFilter,
          searchFilter
        ];
        delete filter.$or;
      }
    }

    const total = await Student.countDocuments(filter);
    const records = await Student.find(filter)
      .select('_id name username email phoneNumber rollNumber registrationNumber classId sessionId createdAt')
      .populate('classId', '_id name grade section')
      .sort({ name: 1, username: 1, _id: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean();

    return res.json({
      success: true,
      message: 'Available students fetched successfully',
      data: {
        records,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          totalPages: Math.max(Math.ceil(total / safeLimit), 1)
        },
        class: {
          _id: classData._id,
          name: classData.name,
          grade: classData.grade,
          section: classData.section,
          sessionId: classData.sessionId
        }
      }
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const assignStudentsToClass = async (req, res) => {
  try {
    const teacherId = req.teacher?.userId;
    const { classId } = req.params;
    const { studentIds = [] } = req.body || {};

    if (!teacherId) {
      return res.json({ success: false, message: 'Teacher authentication required' });
    }

    const normalizedStudentIds = Array.isArray(studentIds)
      ? [...new Set(studentIds.map((id) => String(id || '').trim()).filter(Boolean))]
      : [];

    if (!normalizedStudentIds.length) {
      return res.json({ success: false, message: 'studentIds are required' });
    }

    if (normalizedStudentIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
      return res.json({ success: false, message: 'Invalid studentIds' });
    }

    const { classData, error } = await getClassWithAuthorization(classId, teacherId);
    if (error) {
      return res.json({ success: false, message: error });
    }

    const students = await Student.find({
      _id: { $in: normalizedStudentIds },
      sessionId: classData.sessionId
    })
      .select('_id classId sessionId rollNumber registrationNumber')
      .lean();

    if (!students.length) {
      return res.json({ success: false, message: 'No valid students found for this session' });
    }

    let movedCount = 0;
    let alreadyInClassCount = 0;
    const operations = [];

    for (const student of students) {
      const isAlreadyInTargetClass = String(student.classId || '') === String(classData._id);
      if (isAlreadyInTargetClass) {
        alreadyInClassCount += 1;
        continue;
      }

      const nextRollNumber = await getNextRollNumber(classData._id, classData.sessionId);
      operations.push({
        updateOne: {
          filter: { _id: student._id },
          update: {
            $set: {
              classId: classData._id,
              sessionId: classData.sessionId,
              rollNumber: nextRollNumber
            }
          }
        }
      });
      movedCount += 1;
    }

    if (operations.length) {
      await Student.bulkWrite(operations, { ordered: true });
    }

    return res.json({
      success: true,
      message: 'Student class assignment updated successfully',
      data: {
        movedCount,
        alreadyInClassCount,
        matchedCount: students.length
      }
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

export {
  addClassSubject,
  addClassChapter,
  markClassChapterTaught,
  getClassCurriculum,
  listAvailableStudentsForClass,
  assignStudentsToClass
};
