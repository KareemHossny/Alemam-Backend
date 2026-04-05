const AppError = require("../src/utils/AppError");

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
