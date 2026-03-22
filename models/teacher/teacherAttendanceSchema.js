import mongoose from 'mongoose';

const teacherAttendanceSchema = new mongoose.Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TeacherModel',
    required: true,
    index: true
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Classes',
    default: null
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  subjectName: {
    type: String,
    default: ''
  },
  chapterId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  chapterTitle: {
    type: String,
    default: ''
  },
  date: {
    type: String,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Late'],
    default: 'Present'
  },
  remarks: {
    type: String,
    default: ''
  },
  qrTokenUsed: {
    type: Boolean,
    default: true
  },
  latitude: {
    type: Number,
    default: null
  },
  longitude: {
    type: Number,
    default: null
  },
  distanceMeters: {
    type: Number,
    default: null
  },
  ipAddress: {
    type: String,
    default: ''
  },
  deviceInfo: {
    type: String,
    default: ''
  }
}, { timestamps: true });

teacherAttendanceSchema.index({ teacherId: 1, date: 1 }, { unique: true });

export const TeacherAttendance = mongoose.model('TeacherAttendance', teacherAttendanceSchema);
