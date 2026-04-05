const asyncHandler = require("../../core/middleware/asyncHandler");
const { sendSuccess } = require("../../core/utils/response");
const userService = require("./user.service");

exports.createUser = asyncHandler(async (req, res) => {
  const result = await userService.createUser(req.validated.body);
  return sendSuccess(res, { user: result.user }, result.message, 201);
});

exports.getAllUsers = asyncHandler(async (_req, res) => {
  const users = await userService.getAllUsers();
  return sendSuccess(res, users);
});

exports.deleteUser = asyncHandler(async (req, res) => {
  const result = await userService.deleteUser(req.validated.params.id);
  return sendSuccess(res, null, result.message);
});
