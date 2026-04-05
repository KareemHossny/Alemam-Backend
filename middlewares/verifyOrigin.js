const AppError = require("../src/utils/AppError");
const { isAllowedClientOrigin } = require("../src/utils/clientOrigins");
const logger = require("../src/utils/logger");

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const getRequestOrigin = (req) => {
  const origin = req.get("origin");
  if (origin) {
    return origin;
  }

  const referer = req.get("referer");
  if (!referer) {
    return null;
  }

  try {
    return new URL(referer).origin;
  } catch (error) {
    return null;
  }
};

const verifyOrigin = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const requestOrigin = getRequestOrigin(req);

  if (!requestOrigin || isAllowedClientOrigin(requestOrigin)) {
    return next();
  }

  logger.logSecurityEvent({
    event: "security.origin_blocked",
    message: "Blocked state-changing request from disallowed origin",
    request: logger.getRequestContext(req),
    details: {
      origin: requestOrigin,
    },
  });

  return next(new AppError("Origin not allowed", 403));
};

module.exports = verifyOrigin;
