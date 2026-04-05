const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AppError = require("../src/utils/AppError");
const logger = require("../src/utils/logger");
const { getAuthCookieConfigForRequest, getCookieValue } = require("../src/utils/authCookie");

const auth = async (req, res, next) => {
  try {
    const cookieConfig = getAuthCookieConfigForRequest(req);
    const cookieToken = cookieConfig ? getCookieValue(req, cookieConfig.name) : null;
    const headerToken = req.header("Authorization")?.replace(/^Bearer\s+/i, "");
    const token = cookieToken || headerToken;
    
    if (!token) {
      logger.logSecurityEvent({
        event: "security.auth_token_missing",
        message: "Authentication attempted without a token",
        request: logger.getRequestContext(req),
      });

      return next(new AppError("No token provided", 401, {
        code: "AUTHENTICATION_REQUIRED",
      }));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role === "admin") {
      req.user = decoded;
      return next();
    }

    if (!decoded.id || !decoded.role) {
      logger.logSecurityEvent({
        event: "security.invalid_token_payload",
        message: "Rejected token with missing id or role",
        request: logger.getRequestContext(req),
      });

      return next(new AppError("Invalid token", 401, {
        code: "INVALID_TOKEN",
      }));
    }

    const user = await User.findById(decoded.id).select("_id name email role");

    if (!user || user.role !== decoded.role) {
      logger.logSecurityEvent({
        event: "security.session_expired",
        message: "Rejected token for missing or mismatched user session",
        request: logger.getRequestContext(req),
        details: {
          tokenRole: decoded.role,
          tokenUserId: decoded.id,
        },
      });

      return next(new AppError("Session expired. Please log in again.", 401, {
        code: "SESSION_EXPIRED",
      }));
    }

    req.user = {
      id: String(user._id),
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
    
    next();
  } catch (err) {
    logger.logSecurityEvent({
      event: "security.invalid_token",
      message: "Rejected invalid authentication token",
      request: logger.getRequestContext(req),
      details: {
        errorName: err?.name,
      },
    });

    next(new AppError("Invalid token", 401, {
      code: "INVALID_TOKEN",
    }));
  }
};

module.exports = auth;
