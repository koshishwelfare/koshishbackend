import mongoose from "mongoose";
import validator from "validator";

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    validate: [validator.isEmail, "Please provide a valid email"]
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  registrationNumber: {
    type: String,
    required: false
  },
  rollNumber: {
    type: String
  },
  phoneNumber: {
    type: String,
    required: true
  },
  course: {
    type: String,
    default: ""
  },
  year: {
    type: String,
    default: ""
  },
  profileImage: {
    type: String,
    default: ""
  },
  bio: {
    type: String,
    default: ""
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Classes'
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicSession'
  }
}, { timestamps: true });

studentSchema.index(
  { classId: 1, sessionId: 1, rollNumber: 1 },
  {
    unique: true,
    partialFilterExpression: {
      classId: { $exists: true, $ne: null },
      sessionId: { $exists: true, $ne: null },
      rollNumber: { $exists: true, $type: 'string', $ne: '' }
    }
  }
);


export const Student = mongoose.model('Student', studentSchema);