const { z } = require("zod");
const AppError = require("../src/utils/AppError");

const emptyObjectSchema = z.object({}).strict();

const formatValidationMessage = (error) => {
  const messages = error.issues.flatMap((issue) => {
    if (issue.code === "unrecognized_keys" && issue.keys?.length) {
      return [`Unexpected field(s): ${issue.keys.join(", ")}`];
    }

    const field = issue.path.slice(1).join(".") || issue.path[0];

    return [field ? `${field}: ${issue.message}` : issue.message];
  });

  if (!messages.length) {
    return "Validation error";
  }

  return `Validation error: ${messages.join("; ")}`;
};

const resolveSchemas = (schemas, req) => {
  if (typeof schemas === "function") {
    return schemas(req);
  }

  return schemas || {};
};

const validate = (schemas = {}) => {
  return async (req, res, next) => {
    try {
      const resolvedSchemas = resolveSchemas(schemas, req);
      const requestSchema = z.object({
        body: resolvedSchemas.body || emptyObjectSchema,
        params: resolvedSchemas.params || emptyObjectSchema,
        query: resolvedSchemas.query || emptyObjectSchema,
      });

      const result = await requestSchema.safeParseAsync({
        body: req.body || {},
        params: req.params || {},
        query: req.query || {},
      });

      if (!result.success) {
        throw new AppError(formatValidationMessage(result.error), 400);
      }

      req.body = result.data.body;
      req.params = result.data.params;
      req.query = result.data.query;
      req.validated = result.data;

      return next();
    } catch (error) {
      return next(error);
    }
  };
};

module.exports = validate;
