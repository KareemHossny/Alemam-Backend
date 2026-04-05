const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AppError = require("../src/utils/AppError");
const { getAuthCookieConfigForRequest, getCookieValue } = require("../src/utils/authCookie");

const auth = async (req, res, next) => {
  try {
    const cookieConfig = getAuthCookieConfigForRequest(req);
    const cookieToken = cookieConfig ? getCookieValue(req, cookieConfig.name) : null;
    const headerToken = req.header("Authorization")?.replace(/^Bearer\s+/i, "");
    const token = cookieToken || headerToken;
    
    if (!token) {
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
      return next(new AppError("Invalid token", 401, {
        code: "INVALID_TOKEN",
      }));
    }

    const user = await User.findById(decoded.id).select("_id name email role");

    if (!user || user.role !== decoded.role) {
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
    next(new AppError("Invalid token", 401, {
      code: "INVALID_TOKEN",
    }));
  }
};

module.exports = auth;
