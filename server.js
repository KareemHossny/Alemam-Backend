const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const connectDB = require("./config/mongo");

dotenv.config();

const app = express();

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

// CORS
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
    credentials: false
  })
);

app.use(express.json());

// Connect to MongoDB
(async () => {
  try {
    await connectDB();
  } catch (err) {
    process.exit(1);
  }
})();


app.use("/api/admin", require("./routes/admin"));
app.use("/api/engineer", require("./routes/engineer"));
app.use("/api/supervisor", require("./routes/supervisor"));

app.get("/", (req, res) => {
  res.json({ message: "🚀Alemam Task Manager API is running..." });
});

// Health check
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "Server is running",
    timestamp: new Date().toISOString()
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;