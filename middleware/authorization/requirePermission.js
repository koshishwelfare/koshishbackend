import { canRolePerformAction } from '../../utils/permissions.js';

const resolveRequestRole = (req) => {
  if (req.authRole) return req.authRole;
  if (req.coordinator?.role) return req.coordinator.role;
  if (req.cocircular?.role) return req.cocircular.role;
  if (req.teacher?.role) return req.teacher.role;
  return null;
};

const requirePermission = (action) => {
  return async (req, res, next) => {
    try {
      const role = resolveRequestRole(req);
      if (!role) {
        return res.status(401).json({ success: false, message: 'Unauthorized request' });
      }

      const allowed = await canRolePerformAction(role, action);
      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: `Permission denied: ${role} cannot perform ${action}`
        });
      }

      return next();
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  };
};

export default requirePermission;
