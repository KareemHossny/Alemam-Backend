const pino = require("pino");
const config = require("../config");

const compactObject = (value) =>
  Object.fromEntries(Object.entries(value).filter(([, currentValue]) => currentValue !== undefined));

const getActorContext = (actor) =>
  compactObject({
    actorId: actor?.id ? String(actor.id) : actor?._id ? String(actor._id) : undefined,
    actorRole: actor?.role,
    actorEmail: actor?.email,
  });

const getRequestContext = (req) =>
  compactObject({
    requestId: req?.id,
    method: req?.method,
    path: req?.originalUrl || req?.url,
    ip: req?.ip,
    userAgent: typeof req?.get === "function" ? req.get("user-agent") : undefined,
  });

const logger = pino({
  level: config.logging.level,
  base: {
    service: config.logging.serviceName,
    env: config.app.env,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "request.headers.authorization",
      "request.headers.cookie",
      "headers.authorization",
      "headers.cookie",
      "password",
      "*.password",
      "body.password",
      "payload.password",
      "credentials.password",
    ],
    remove: true,
  },
  serializers: {
    err: pino.stdSerializers.err,
  },
});

const logAuthAttempt = ({ outcome, role, email, userId, reason, request = {} }) => {
  const level = outcome === "success" ? "info" : "warn";
  const message = outcome === "success" ? `${role} login successful` : `${role} login failed`;

  logger[level](
    compactObject({
      event: "auth.login",
      outcome,
      role,
      email,
      userId: userId ? String(userId) : undefined,
      reason,
      ...request,
    }),
    message
  );
};

const logDataMutation = ({ action, entity, entityId, actor, details = {} }) => {
  logger.info(
    compactObject({
      event: "data.mutation",
      action,
      entity,
      entityId: entityId ? String(entityId) : undefined,
      ...getActorContext(actor),
      ...details,
    }),
    `${entity} ${action}`
  );
};

const logSecurityEvent = ({ event, message, level = "warn", actor, request = {}, details = {} }) => {
  const logMethod = typeof logger[level] === "function" ? logger[level].bind(logger) : logger.warn.bind(logger);

  logMethod(
    compactObject({
      event,
      ...getActorContext(actor),
      ...request,
      ...details,
    }),
    message
  );
};

module.exports = Object.assign(logger, {
  compactObject,
  getActorContext,
  getRequestContext,
  logAuthAttempt,
  logDataMutation,
  logSecurityEvent,
});
