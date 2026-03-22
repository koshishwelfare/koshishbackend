import mongoose from 'mongoose';

const dailyTeachingLogSchema = new mongoose.Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TeacherModel',
    required: true,
    index: true
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Classes',
    required: true,
    index: true
  },
  date: {
    type: String,
    required: true,
    index: true
  },
  topic: {
    type: String,
    required: true,
    trim: true
  },
  subjectName: {
    type: String,
    default: '',
    trim: true
  },
  chapterTitle: {
    type: String,
    default: '',
    trim: true
  },
  summary: {
    type: String,
    default: ''
  },
  homework: {
    type: String,
    default: ''
  },
  nextPlan: {
    type: String,
    default: ''
  },
  durationMinutes: {
    type: Number,
    default: 0,
    min: 0
  }
}, { timestamps: true });

dailyTeachingLogSchema.index({ teacherId: 1, classId: 1, date: 1 }, { unique: true });

export const DailyTeachingLog = mongoose.model('DailyTeachingLog', dailyTeachingLogSchema);
