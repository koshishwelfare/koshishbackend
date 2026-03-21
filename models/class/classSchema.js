import mongoose from "mongoose";
import validator from "validator";

const classSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  grade: {
    type: String,
    required: true
  },
  section: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    default: 'A'
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicSession',
    required: true
  },
  mentorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TeacherModel',
    required: true
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TeacherModel'
  },
  teacherIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TeacherModel'
    }
  ],
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });


export const Class = mongoose.model('Classes', classSchema);