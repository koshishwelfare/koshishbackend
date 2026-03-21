import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema({
  questionIndex: {
    type: Number,
    required: true
  },
  selectedOption: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

const testSubmissionSchema = new mongoose.Schema({
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TestSeries',
    required: true,
    index: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  answers: {
    type: [answerSchema],
    default: []
  },
  score: {
    type: Number,
    required: true,
    default: 0
  },
  totalMarks: {
    type: Number,
    required: true,
    default: 0
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

testSubmissionSchema.index({ testId: 1, studentId: 1 }, { unique: true });

export const TestSubmission = mongoose.model('TestSubmission', testSubmissionSchema);
