const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const connectDB = require("./config/mongo");
const { getConnectionState } = require("./config/mongo");
const config = require("./src/config");
const verifyOrigin = require("./src/core/middleware/verifyOrigin");
const ensureDatabaseConnection = require("./src/core/middleware/ensureDatabaseConnection");
const errorHandler = require("./src/core/middleware/errorHandler");
const notFound = require("./src/core/middleware/notFound");
const requestLogger = require("./src/core/middleware/requestLogger");
const { clientOrigins } = require("./src/utils/clientOrigins");
const logger = require("./src/core/utils/logger");
const { sendSuccess } = require("./src/core/utils/response");

const app = express();

const parseOriginList = (value = "") =>
  value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const csrfAllowedOrigins = parseOriginList(process.env.CSRF_ALLOWED_ORIGINS);
const csrfOriginAllowlist = csrfAllowedOrigins.length > 0 ? csrfAllowedOrigins : clientOrigins;
const corsOptions = {
  origin: clientOrigins,
  credentials: true,
  optionsSuccessStatus: 204,
};
const DATABASE_CONNECTION_STATE = Object.freeze({
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
});

// Trust the configured proxy hops so req.ip reflects the real client IP.
app.set("trust proxy", config.app.trustProxyHops);

app.use(requestLogger);

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

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(verifyOrigin({
  allowedOrigins: csrfOriginAllowlist,
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const databaseConnection = connectDB()
  .then(() => {
    logger.info({ event: "bootstrap.database.connected" }, "MongoDB connected");
    return true;
  })
  .catch((err) => {
    logger.fatal({ event: "bootstrap.database.connection_failed", err }, "MongoDB connection failed");
    return false;
  });

app.use(ensureDatabaseConnection);

app.use("/api/admin", require("./routes/admin"));
app.use("/api/engineer", require("./routes/engineer"));
app.use("/api/supervisor", require("./routes/supervisor"));

app.get("/", (_req, res) =>
  sendSuccess(
    res,
    {
      version: "1.0.0",
      environment: config.app.env,
      status: "active",
    },
    "Alemam Task Manager API"
  )
);

app.get("/health", (_req, res) =>
  sendSuccess(
    res,
    {
      status: "ok",
      environment: config.app.env,
      database: DATABASE_CONNECTION_STATE[getConnectionState()] || "unknown",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
    "Health check successful"
  )
);

app.use(notFound);
app.use(errorHandler);

if (config.app.shouldStartServer) {
  databaseConnection.then((isConnected) => {
    if (!isConnected) {
      process.exit(1);
      return;
    }

    app.listen(config.app.port, () => {
      logger.info({ event: "bootstrap.server.started", port: config.app.port }, "Server started");
    });
  });
}

module.exports = app;
