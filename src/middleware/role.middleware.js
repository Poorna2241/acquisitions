import logger from '#config/logger.js';

export const authorize = (allowedRoles = ['admin']) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(
        `User ${req.user.email || req.user.id} with role ${req.user.role} attempted unauthorized access to ${req.originalUrl}`
      );
      return res
        .status(403)
        .json({ error: 'Access denied: Insufficient permissions' });
    }

    next();
  };
};

export const requireAdmin = authorize(['admin']);
