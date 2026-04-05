const AppError = require("../src/utils/AppError");

const authorize = (roles = []) => {
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

module.exports = authorize;
