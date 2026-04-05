const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const connectDB = require("./config/mongo");
const verifyOrigin = require("./middlewares/verifyOrigin");
const errorHandler = require("./middlewares/errorHandler");
const notFound = require("./middlewares/notFound");
const { clientOrigins } = require("./src/utils/clientOrigins");
const { sendSuccess } = require("./src/utils/response");

dotenv.config();

const app = express();

// Trust the first proxy hop so req.ip reflects the real client IP in production.
app.set("trust proxy", 1);

// Production Security Settings
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS for Production
app.use(cors({
  origin: clientOrigins,
  credentials: true
}));

app.use(verifyOrigin);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Production Database Connection
connectDB().then(() => {
  console.log("✅ MongoDB Connected to Production");
}).catch(err => {
  console.error("❌ Production MongoDB connection failed:", err);
});

// Routes
app.use("/api/admin", require("./routes/admin"));
app.use("/api/engineer", require("./routes/engineer"));
app.use("/api/supervisor", require("./routes/supervisor"));

// Production Root Route
app.get("/", (req, res) => {
  return sendSuccess(
    res,
    {
      version: "1.0.0",
      environment: "production",
      status: "active",
    },
    "Alemam Task Manager API - Production"
  );
});

// Production Health Check
app.get("/health", (req, res) => {
  return sendSuccess(
    res,
    {
      status: "ok",
      environment: "production",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
    "Health check successful"
  );
});

app.use(notFound);
app.use(errorHandler);

// Start server locally فقط
if (process.env.VERCEL !== "1") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Production Server running on port ${PORT}`);
  });
}

module.exports = app;
