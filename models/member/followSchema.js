import mongoose from 'mongoose';

const followSchema = new mongoose.Schema(
  {
    followerStudentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      default: null,
      index: true
    },
    followerTeacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TeacherModel',
      default: null,
      index: true
    },
    followingTeacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TeacherModel',
      required: true,
      index: true
    }
  },
  { timestamps: true }
);

followSchema.index(
  { followerStudentId: 1, followingTeacherId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      followerStudentId: { $exists: true, $ne: null }
    }
  }
);

followSchema.index(
  { followerTeacherId: 1, followingTeacherId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      followerTeacherId: { $exists: true, $ne: null }
    }
  }
);

export const Follow = mongoose.model('Follow', followSchema);
