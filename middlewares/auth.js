const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { getAuthCookieConfigForRequest, getCookieValue } = require("../src/utils/authCookie");

const auth = async (req, res, next) => {
  try {
    const cookieConfig = getAuthCookieConfigForRequest(req);
    const cookieToken = cookieConfig ? getCookieValue(req, cookieConfig.name) : null;
    const headerToken = req.header("Authorization")?.replace(/^Bearer\s+/i, "");
    const token = cookieToken || headerToken;
    
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role === "admin") {
      req.user = decoded;
      return next();
    }

    if (!decoded.id || !decoded.role) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const user = await User.findById(decoded.id).select("_id name email role");

    if (!user || user.role !== decoded.role) {
      return res.status(401).json({ message: "Session expired. Please log in again." });
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
    res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = auth;
