import mongoose from 'mongoose';

const academicSessionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  startYear: {
    type: Number,
    required: true
  },
  endYear: {
    type: Number,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

export const AcademicSession = mongoose.model('AcademicSession', academicSessionSchema);
