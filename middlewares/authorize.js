const AppError = require("../src/utils/AppError");
const logger = require("../src/utils/logger");

const normalizeRoles = (roles = []) => {
  if (roles.length === 1 && Array.isArray(roles[0])) {
    return roles[0];
  }

  return roles;
};

const authorizeRoles = (...roleArgs) => {
  const roles = normalizeRoles(roleArgs);

  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, {
        code: "AUTHENTICATION_REQUIRED",
      }));
    }

    if (!roles.includes(req.user.role)) {
      logger.logSecurityEvent({
        event: "security.access_denied",
        message: "Role-based access denied",
        actor: req.user,
        request: logger.getRequestContext(req),
        details: {
          allowedRoles: roles,
        },
      });

      return next(new AppError("Access denied", 403, {
        code: "ACCESS_DENIED",
      }));
    }

    next();
  };
};

module.exports = authorizeRoles;
module.exports.authorizeRoles = authorizeRoles;
module.exports.authorize = authorizeRoles;
