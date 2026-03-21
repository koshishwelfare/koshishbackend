import { Permission } from '../models/auth/permissionSchema.js';

const DEFAULT_PERMISSIONS = [
  { role: 'coordinator', action: 'add_cocircular', allowed: true },
  { role: 'coordinator', action: 'add_teacher', allowed: false },
  { role: 'coordinator', action: 'add_student', allowed: false },
  { role: 'cocirculer', action: 'add_cocircular', allowed: false },
  { role: 'cocirculer', action: 'add_teacher', allowed: true },
  { role: 'cocirculer', action: 'add_student', allowed: false },
  { role: 'teacher', action: 'add_cocircular', allowed: false },
  { role: 'teacher', action: 'add_teacher', allowed: false },
  { role: 'teacher', action: 'add_student', allowed: true }
];

const ensureDefaultPermissions = async () => {
  const operations = DEFAULT_PERMISSIONS.map((item) => ({
    updateOne: {
      filter: { role: item.role, action: item.action },
      update: { $setOnInsert: item },
      upsert: true
    }
  }));

  if (!operations.length) return;
  await Permission.bulkWrite(operations, { ordered: false });
};

const canRolePerformAction = async (role, action) => {
  const permission = await Permission.findOne({ role, action }, { allowed: 1 });
  return Boolean(permission?.allowed);
};

export { DEFAULT_PERMISSIONS, ensureDefaultPermissions, canRolePerformAction };
