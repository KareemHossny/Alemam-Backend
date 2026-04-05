const authService = require("../src/services/auth.service");
const projectService = require("../src/services/project.service");
const taskService = require("../src/services/task.service");
const statsService = require("../src/services/stats.service");
const { getAuthCookieConfig } = require("../src/utils/authCookie");
const { sendSuccess, sendError, extractResultPayload } = require("../src/utils/response");
const AppError = require("../src/utils/AppError");
const asyncHandler = require("../middlewares/asyncHandler");

const ENGINEER_COOKIE_CONFIG = getAuthCookieConfig("engineer");

const sendBulkResult = (res, result, successMessage) => {
  const { statusCode, message, ...details } = result;

  if (statusCode >= 400) {
    return sendError(
      res,
      new AppError(message, statusCode, {
        code: "BULK_OPERATION_FAILED",
        details,
      })
    );
  }

  return sendSuccess(res, details, message || successMessage, statusCode);
};

exports.engineerLogin = asyncHandler(async (req, res) => {
  const result = await authService.loginEngineer(req.validated.body);
  const { token, message, user } = result;

  res.cookie(ENGINEER_COOKIE_CONFIG.name, token, ENGINEER_COOKIE_CONFIG.setOptions);

  return sendSuccess(res, { user }, message);
});

exports.engineerLogout = asyncHandler(async (req, res) => {
  const result = authService.logout("Engineer logout successful");

  res.clearCookie(ENGINEER_COOKIE_CONFIG.name, ENGINEER_COOKIE_CONFIG.clearOptions);

  return sendSuccess(res, null, result.message);
});

exports.getCurrentEngineerUser = asyncHandler(async (req, res) => {
  const result = await authService.getCurrentEngineerUser(req.user);
  return sendSuccess(res, { user: result.user }, result.message);
});

exports.getEngineerProjects = asyncHandler(async (req, res) => {
  const projects = await projectService.getEngineerProjects(req.user.id);
  return sendSuccess(res, projects);
});

exports.addDailyTask = asyncHandler(async (req, res) => {
  const task = await taskService.createDailyTask(req.validated.body, req.user);
  return sendSuccess(res, task, "Daily task created successfully", 201);
});

exports.addDailyTasksBulk = asyncHandler(async (req, res) => {
  const result = await taskService.createDailyTasksBulk(req.validated.body, req.user);
  return sendBulkResult(res, result, "Daily tasks created successfully");
});

exports.getDailyTasks = asyncHandler(async (req, res) => {
  const tasks = await taskService.getEngineerDailyTasks(req.validated.params.projectId, req.user, req.validated.query);
  return sendSuccess(res, tasks);
});

exports.deleteDailyTask = asyncHandler(async (req, res) => {
  const result = await taskService.deleteDailyTask(req.validated.params.taskId, req.user);
  return sendSuccess(res, null, result.message);
});

exports.addMonthlyTask = asyncHandler(async (req, res) => {
  const task = await taskService.createMonthlyTask(req.validated.body, req.user);
  return sendSuccess(res, task, "Monthly task created successfully", 201);
});

exports.addMonthlyTasksBulk = asyncHandler(async (req, res) => {
  const result = await taskService.createMonthlyTasksBulk(req.validated.body, req.user);
  return sendBulkResult(res, result, "Monthly tasks created successfully");
});

exports.getMonthlyTasks = asyncHandler(async (req, res) => {
  const tasks = await taskService.getEngineerMonthlyTasks(req.validated.params.projectId, req.user, req.validated.query);
  return sendSuccess(res, tasks);
});

exports.deleteMonthlyTask = asyncHandler(async (req, res) => {
  const result = await taskService.deleteMonthlyTask(req.validated.params.taskId, req.user);
  return sendSuccess(res, null, result.message);
});

exports.getDashboardStats = asyncHandler(async (req, res) => {
  const result = await statsService.getEngineerDashboardStats(req.user);
  const { data, message } = extractResultPayload(result, "Engineer dashboard stats fetched successfully");
  return sendSuccess(res, data, message);
});
