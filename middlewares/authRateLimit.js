const rateLimit = require("express-rate-limit");
const AppError = require("../src/utils/AppError");
const { sendError } = require("../src/utils/response");

const FIFTEEN_MINUTES_IN_MS = 15 * 60 * 1000;

const getRetryAfterSeconds = (req, windowMs) => {
  if (req.rateLimit?.resetTime instanceof Date) {
    return Math.max(1, Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000));
  }

  return Math.ceil(windowMs / 1000);
};

const createAuthRateLimiter = ({ limit, routeLabel }) =>
  rateLimit({
    windowMs: FIFTEEN_MINUTES_IN_MS,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: (req, res, _next, options) => {
      return sendError(
        res,
        new AppError(
          `Too many ${routeLabel} login attempts. Please try again in 15 minutes.`,
          options.statusCode,
          {
            code: "AUTH_RATE_LIMITED",
            details: {
              retryAfterSeconds: getRetryAfterSeconds(req, options.windowMs),
            },
          }
        )
      );
    },
  });

const authRateLimiters = Object.freeze({
  adminLogin: createAuthRateLimiter({
    limit: 5,
    routeLabel: "admin",
  }),
  engineerLogin: createAuthRateLimiter({
    limit: 7,
    routeLabel: "engineer",
  }),
  supervisorLogin: createAuthRateLimiter({
    limit: 7,
    routeLabel: "supervisor",
  }),
});

module.exports = {
  FIFTEEN_MINUTES_IN_MS,
  createAuthRateLimiter,
  authRateLimiters,
};
