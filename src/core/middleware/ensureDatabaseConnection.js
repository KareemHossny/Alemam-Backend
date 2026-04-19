const AppError = require("../../utils/AppError");
const logger = require("../../utils/logger");
const { connectDB } = require("../../../config/mongo");

const DATABASE_OPTIONAL_ROUTES = new Set([
  "GET /",
  "GET /health",
  "POST /api/admin/login",
  "POST /api/admin/logout",
  "GET /api/admin/me",
]);

const buildRouteKey = (req) => `${req.method.toUpperCase()} ${req.path || req.originalUrl || req.url || "/"}`;

const shouldSkipDatabaseCheck = (req) => (
  req.method?.toUpperCase() === "OPTIONS"
  || DATABASE_OPTIONAL_ROUTES.has(buildRouteKey(req))
);

const ensureDatabaseConnection = async (req, _res, next) => {
  if (shouldSkipDatabaseCheck(req)) {
    return next();
  }

  try {
    await connectDB();
    return next();
  } catch (error) {
    req.log?.error(
      logger.compactObject({
        event: "database.connection.unavailable",
        method: req.method,
        path: req.originalUrl || req.url,
        errorName: error?.name,
        errorMessage: error?.message,
        code: error?.code,
      }),
      "database connection unavailable"
    );

    return next(new AppError("Database unavailable", 503, {
      code: "DATABASE_UNAVAILABLE",
    }));
  }
};

module.exports = ensureDatabaseConnection;
