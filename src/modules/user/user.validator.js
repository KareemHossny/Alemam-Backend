const { z } = require("zod");
const { noInputSchema, objectId, requiredText, strictObject } = require("../../validators/common");
const { USER_ROLES } = require("../../../models/User");

const createUserSchema = {
  body: strictObject({
    name: requiredText("name"),
    email: z
      .string({
        required_error: "email is required",
        invalid_type_error: "email must be a string",
      })
      .trim()
      .email("Invalid email"),
    password: z
      .string({
        required_error: "password is required",
        invalid_type_error: "password must be a string",
      })
      .min(8, "Password must be at least 8 characters"),
    role: z.enum(USER_ROLES, {
      errorMap: () => ({ message: "role must be one of admin, engineer, or supervisor" }),
    }),
  }),
  params: noInputSchema,
  query: noInputSchema,
};

const deleteUserSchema = {
  body: noInputSchema,
  params: strictObject({
    id: objectId("id"),
  }),
  query: noInputSchema,
};

const listUsersSchema = {
  body: noInputSchema,
  params: noInputSchema,
  query: noInputSchema,
};

module.exports = {
  createUserSchema,
  deleteUserSchema,
  listUsersSchema,
};
