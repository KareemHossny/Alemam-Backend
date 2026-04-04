const jwt = require("jsonwebtoken");
const { getAuthCookieConfigForRequest, getCookieValue } = require("../src/utils/authCookie");

const auth = (req, res, next) => {
  try {
    const cookieConfig = getAuthCookieConfigForRequest(req);
    const cookieToken = cookieConfig ? getCookieValue(req, cookieConfig.name) : null;
    const headerToken = req.header("Authorization")?.replace(/^Bearer\s+/i, "");
    const token = cookieToken || headerToken;
    
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = auth;
