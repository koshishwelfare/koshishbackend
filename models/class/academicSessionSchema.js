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
  },
  holidays: {
    type: [
      {
        title: {
          type: String,
          required: true,
          trim: true
        },
        date: {
          type: Date,
          required: true
        },
        description: {
          type: String,
          default: '',
          trim: true
        },
        isActive: {
          type: Boolean,
          default: true
        }
      }
    ],
    default: []
  }
}, { timestamps: true });

export const AcademicSession = mongoose.model('AcademicSession', academicSessionSchema);
