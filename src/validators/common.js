const { z } = require("zod");

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const strictObject = (shape) => z.object(shape).strict();

const objectId = (fieldName) =>
  z
    .string({
      required_error: `${fieldName} is required`,
      invalid_type_error: `${fieldName} must be a string`,
    })
    .trim()
    .regex(OBJECT_ID_REGEX, `Invalid ${fieldName}`);

const requiredText = (fieldName, max = 255) =>
  z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z
      .string({
        required_error: `${fieldName} is required`,
        invalid_type_error: `${fieldName} must be a string`,
      })
      .min(1, `${fieldName} is required`)
      .max(max, `${fieldName} must be at most ${max} characters`)
  );

const optionalText = (fieldName, max = 2000) =>
  z
    .preprocess(
      (value) => (typeof value === "string" ? value.trim() : value),
      z
        .string({
          invalid_type_error: `${fieldName} must be a string`,
        })
        .max(max, `${fieldName} must be at most ${max} characters`)
        .optional()
    )
    .transform((value) => (value === "" ? undefined : value));

const isValidIsoDate = (value) => {
  if (!ISO_DATE_REGEX.test(value)) {
    return false;
  }

  const parsedDate = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().startsWith(value);
};

const isoDate = (fieldName = "date") =>
  z
    .string({
      required_error: `${fieldName} is required`,
      invalid_type_error: `${fieldName} must be a string`,
    })
    .trim()
    .refine(isValidIsoDate, `Invalid ${fieldName}`);

const objectIdArray = (fieldName) =>
  z
    .array(objectId(fieldName))
    .default([])
    .transform((ids) => [...new Set(ids)]);

const noInputSchema = strictObject({});

module.exports = {
  strictObject,
  objectId,
  requiredText,
  optionalText,
  isoDate,
  objectIdArray,
  noInputSchema,
};
