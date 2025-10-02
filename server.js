const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const connectDB = require("./config/mongo");

dotenv.config();

const app = express();

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
  origin: [
    "http://localhost:3000", 
    "http://localhost:3001", 
    "http://localhost:3002",
  ],
  credentials: false
}));

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
  res.json({ 
    message: "🚀 Alemam Task Manager API - Production",
    version: "1.0.0",
    environment: "production",
    status: "active"
  });
});

// Production Health Check
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    environment: "production",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error Handling for Production
app.use((err, req, res, next) => {
  console.error('Production Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    environment: 'production'
  });
});

// Start server locally فقط
if (process.env.VERCEL !== "1") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Production Server running on port ${PORT}`);
  });
}

module.exports = app;