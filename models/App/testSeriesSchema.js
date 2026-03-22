import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true
  },
  options: {
    type: [String],
    validate: {
      validator: (value) => Array.isArray(value) && value.length >= 2,
      message: 'Question must have at least 2 options'
    },
    required: true
  },
  correctOption: {
    type: Number,
    required: true,
    min: 0
  },
  explanation: {
    type: String,
    default: ''
  },
  marks: {
    type: Number,
    default: 1,
    min: 1
  }
}, { _id: false });

const testSeriesSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  subject: {
    type: String,
    default: ''
  },
  className: {
    type: String,
    default: ''
  },
  durationMinutes: {
    type: Number,
    default: 30,
    min: 1
  },
  questions: {
    type: [questionSchema],
    default: []
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdByRole: {
    type: String,
    enum: ['teacher', 'coordinator', 'cocirculer'],
    default: 'teacher'
  },
  createdById: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TeacherModel',
    default: null,
    index: true
  }
}, { timestamps: true });

export const TestSeries = mongoose.model('TestSeries', testSeriesSchema);
