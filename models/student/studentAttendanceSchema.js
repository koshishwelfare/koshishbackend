import mongoose from 'mongoose';

const studentAttendanceSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  date: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Late'],
    required: true
  },
  remarks: {
    type: String,
    default: ''
  },
  markedByRole: {
    type: String,
    default: 'teacher'
  },
  source: {
    type: String,
    enum: ['teacher', 'student-self', 'system'],
    default: 'teacher'
  },
  ipAddress: {
    type: String,
    default: ''
  },
  deviceInfo: {
    type: String,
    default: ''
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
  }
}, { timestamps: true });

studentAttendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });

export const StudentAttendance = mongoose.model('StudentAttendance', studentAttendanceSchema);
