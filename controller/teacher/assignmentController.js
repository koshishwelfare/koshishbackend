import { Assignment } from '../../models/class/assignmentSchema.js';
import { AcademicSession } from '../../models/class/academicSessionSchema.js';
import { Class } from '../../models/class/classSchema.js';
import MemberModel from '../../models/member/MemberSchema.js';

const normalizeDeadline = (deadlineValue) => {
  const parsed = new Date(deadlineValue);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
};

const createAssignment = async (req, res) => {
  try {
    const {
      title,
      description,
      subject = '',
      grade,
      classId,
      sessionId,
      teacherId,
      deadline,
      isActive = true
    } = req.body;

    if (!title || !description || !grade || !classId || !deadline) {
      return res.json({
        success: false,
        message: 'title, description, grade, classId and deadline are required'
      });
    }

    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      return res.json({ success: false, message: 'Class not found' });
    }

    const effectiveSessionId = sessionId || classDoc.sessionId;
    const foundSession = await AcademicSession.findById(effectiveSessionId);
    if (!foundSession) {
      return res.json({ success: false, message: 'Session not found' });
    }

    if (String(classDoc.sessionId) !== String(foundSession._id)) {
      return res.json({ success: false, message: 'Class does not belong to provided session' });
    }

    if (teacherId) {
      const foundTeacher = await MemberModel.findOne({ _id: teacherId, role: 'mentor' });
      if (!foundTeacher) {
        return res.json({ success: false, message: 'Teacher not found' });
      }
    }

    const parsedDeadline = normalizeDeadline(deadline);
    if (!parsedDeadline) {
      return res.json({ success: false, message: 'Invalid deadline format' });
    }

    const created = await Assignment.create({
      title,
      description,
      subject,
      grade,
      classId,
      sessionId: foundSession._id,
      teacherId: teacherId || classDoc.teacherId || undefined,
      deadline: parsedDeadline,
      isActive: Boolean(isActive)
    });

    return res.json({ success: true, message: 'Assignment created successfully', data: created });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const getTeacherAssignments = async (req, res) => {
  try {
    const { classId, sessionId, isActive } = req.query;
    const filter = {};

    if (classId) {
      filter.classId = classId;
    }

    if (sessionId) {
      filter.sessionId = sessionId;
    }

    if (isActive !== undefined) {
      filter.isActive = String(isActive) === 'true';
    }

    const data = await Assignment.find(filter)
      .populate('classId', 'name grade')
      .populate('sessionId', 'name startYear endYear')
      .populate('teacherId', 'username email')
      .sort({ createdAt: -1 });

    return res.json({ success: true, message: 'Assignments fetched successfully', data });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const updateTeacherAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const allowed = ['title', 'description', 'subject', 'grade', 'deadline', 'isActive'];
    const patch = {};

    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        patch[field] = req.body[field];
      }
    }

    if (patch.deadline !== undefined) {
      const parsedDeadline = normalizeDeadline(patch.deadline);
      if (!parsedDeadline) {
        return res.json({ success: false, message: 'Invalid deadline format' });
      }
      patch.deadline = parsedDeadline;
    }

    const updated = await Assignment.findByIdAndUpdate(assignmentId, patch, {
      new: true,
      runValidators: true
    });

    if (!updated) {
      return res.json({ success: false, message: 'Assignment not found' });
    }

    return res.json({ success: true, message: 'Assignment updated successfully', data: updated });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

export { createAssignment, getTeacherAssignments, updateTeacherAssignment };
