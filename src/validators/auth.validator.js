const { z } = require("zod");
const { noInputSchema, strictObject } = require("./common");

const loginSchema = {
  body: strictObject({
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
  }),
  params: noInputSchema,
  query: noInputSchema,
};

const bootstrapAdminSchema = {
  body: strictObject({
    name: z
      .string({
        required_error: "name is required",
        invalid_type_error: "name must be a string",
      })
      .trim()
      .min(1, "name is required"),
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
  }),
  params: noInputSchema,
  query: noInputSchema,
};

const logoutSchema = {
  body: noInputSchema,
  params: noInputSchema,
  query: noInputSchema,
};

const currentUserSchema = {
  body: noInputSchema,
  params: noInputSchema,
  query: noInputSchema,
};

module.exports = {
  bootstrapAdminSchema,
  loginSchema,
  logoutSchema,
  currentUserSchema,
};
