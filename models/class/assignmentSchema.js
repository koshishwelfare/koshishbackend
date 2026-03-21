import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    default: ''
  },
  grade: {
    type: String,
    required: true
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Classes',
    required: true,
    index: true
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicSession',
    required: true,
    index: true
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TeacherModel',
    required: false,
    index: true
  },
  deadline: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
}, { timestamps: true });

assignmentSchema.index({ classId: 1, sessionId: 1, deadline: -1 });

export const Assignment = mongoose.model('Assignment', assignmentSchema);
