const AppError = require("../src/utils/AppError");
const logger = require("../src/utils/logger");
const { sendError } = require("../src/utils/response");

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = Number(err?.statusCode) || 500;
  const level = statusCode >= 500 ? "error" : "warn";
  const requestLogger = req?.log || logger;

  requestLogger[level](
    logger.compactObject({
      event: "api.error",
      err,
      statusCode,
      code: err?.code,
      requestId: req?.id,
      method: req?.method,
      path: req?.originalUrl,
      ip: req?.ip,
      userId: req?.user?.id ? String(req.user.id) : undefined,
      actorRole: req?.user?.role,
    }),
    err?.message || "API error"
  );

  if (err instanceof AppError) {
    return sendError(res, err);
  }

  return sendError(
    res,
    new AppError("Internal Server Error", 500, {
      code: "INTERNAL_SERVER_ERROR",
    })
  );
};

module.exports = errorHandler;
