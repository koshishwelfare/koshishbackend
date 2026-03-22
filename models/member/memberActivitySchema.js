import mongoose from 'mongoose';

const memberActivitySchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TeacherModel',
      required: true,
      index: true
    },
    activityType: {
      type: String,
      enum: ['daily_activity', 'test', 'event'],
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    activityDate: {
      type: Date,
      default: Date.now,
      index: true
    },
    source: {
      type: String,
      enum: ['manual', 'system'],
      default: 'manual'
    }
  },
  { timestamps: true }
);

memberActivitySchema.index({ memberId: 1, activityDate: -1 });

export const MemberActivity = mongoose.model('MemberActivity', memberActivitySchema);
