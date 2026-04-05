const AppError = require("../src/utils/AppError");
const { clientOrigins } = require("../src/utils/clientOrigins");
const logger = require("../src/utils/logger");

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const normalizeOrigin = (value) => {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch (error) {
    return null;
  }
};

const createAllowedOriginSet = (allowedOrigins = clientOrigins) =>
  new Set(
    allowedOrigins
      .map((origin) => normalizeOrigin(origin))
      .filter(Boolean)
  );

const createVerifyOrigin = ({ allowedOrigins = clientOrigins } = {}) => {
  const allowedOriginSet = createAllowedOriginSet(allowedOrigins);

  return (req, res, next) => {
    if (SAFE_METHODS.has(req.method)) {
      return next();
    }

    const requestOrigin = normalizeOrigin(req.get("origin"));

    if (!requestOrigin) {
      logger.logSecurityEvent({
        event: "security.origin_missing",
        message: "Blocked state-changing request without Origin header",
        request: logger.getRequestContext(req),
      });

      return next(new AppError("Origin header is required", 403));
    }

    if (allowedOriginSet.has(requestOrigin)) {
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
};

const isExpressRequest = (value) => (
  value
  && typeof value === "object"
  && typeof value.method === "string"
  && typeof value.get === "function"
);

const verifyOrigin = (reqOrOptions, res, next) => {
  if (isExpressRequest(reqOrOptions)) {
    return createVerifyOrigin()(reqOrOptions, res, next);
  }

  return createVerifyOrigin(reqOrOptions);
};

module.exports = verifyOrigin;
module.exports.createVerifyOrigin = createVerifyOrigin;
module.exports.normalizeOrigin = normalizeOrigin;
