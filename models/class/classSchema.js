import mongoose from "mongoose";
import validator from "validator";

const chapterSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    isTaught: {
      type: Boolean,
      default: false
    },
    taughtAt: {
      type: Date,
      default: null
    },
    taughtBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TeacherModel',
      default: null
    },
    taughtLogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DailyTeachingLog',
      default: null
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TeacherModel',
      default: null
    },
    chapters: {
      type: [chapterSchema],
      default: []
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

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
  subjects: {
    type: [subjectSchema],
    default: []
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });


export const Class = mongoose.model('Classes', classSchema);