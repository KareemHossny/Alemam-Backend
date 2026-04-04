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

const validate = (schemas = {}) => {
  const requestSchema = z.object({
    body: schemas.body || emptyObjectSchema,
    params: schemas.params || emptyObjectSchema,
    query: schemas.query || emptyObjectSchema,
  });

  return (req, res, next) => {
    const result = requestSchema.safeParse({
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
  };
};

module.exports = validate;
