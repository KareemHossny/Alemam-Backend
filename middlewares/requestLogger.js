const { randomUUID } = require("crypto");
const logger = require("../src/utils/logger");

const REQUEST_ID_HEADER = "X-Request-Id";

const getLogLevel = (statusCode) => {
  if (statusCode >= 500) {
    return "error";
  }

  if (statusCode >= 400) {
    return "warn";
  }

  return "info";
};

const requestLogger = (req, res, next) => {
  const requestId = req.get("x-request-id") || randomUUID();
  const startedAt = process.hrtime.bigint();

  req.id = requestId;
  req.log = logger.child({ requestId });
  res.setHeader(REQUEST_ID_HEADER, requestId);

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const responseSize = res.getHeader("content-length");
    const level = getLogLevel(res.statusCode);

    req.log[level](
      logger.compactObject({
        event: "http.request.completed",
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
        ip: req.ip,
        userAgent: req.get("user-agent"),
        userId: req.user?.id ? String(req.user.id) : undefined,
        role: req.user?.role,
        responseSize: responseSize !== undefined ? Number(responseSize) : undefined,
      }),
      "request completed"
    );
  });

  next();
};

module.exports = requestLogger;
