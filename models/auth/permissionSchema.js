import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      required: true,
      enum: ['coordinator', 'cocirculer', 'teacher']
    },
    action: {
      type: String,
      required: true,
      enum: ['add_cocircular', 'add_teacher', 'add_student']
    },
    allowed: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

permissionSchema.index({ role: 1, action: 1 }, { unique: true });

export const Permission = mongoose.model('Permission', permissionSchema);
