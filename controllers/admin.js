const authService = require("../src/services/auth.service");
const userService = require("../src/services/user.service");
const projectService = require("../src/services/project.service");
const taskService = require("../src/services/task.service");
const statsService = require("../src/services/stats.service");
const { getAuthCookieConfig } = require("../src/utils/authCookie");
const { sendSuccess, extractResultPayload } = require("../src/utils/response");
const asyncHandler = require("../middlewares/asyncHandler");

const ADMIN_COOKIE_CONFIG = getAuthCookieConfig("admin");

exports.adminLogin = asyncHandler(async (req, res) => {
  const result = await authService.loginAdmin(req.validated.body);
  const { token, message, user } = result;

  res.cookie(ADMIN_COOKIE_CONFIG.name, token, ADMIN_COOKIE_CONFIG.setOptions);

  return sendSuccess(res, { user }, message);
});

exports.adminLogout = asyncHandler(async (req, res) => {
  const result = authService.logout("Logout successful");

  res.clearCookie(ADMIN_COOKIE_CONFIG.name, ADMIN_COOKIE_CONFIG.clearOptions);

  return sendSuccess(res, null, result.message);
});

exports.getCurrentAdminUser = asyncHandler(async (req, res) => {
  const result = await authService.getCurrentAdminUser();
  return sendSuccess(res, { user: result.user }, result.message);
});

exports.createUser = asyncHandler(async (req, res) => {
  const result = await userService.createUser(req.validated.body);
  return sendSuccess(res, { user: result.user }, result.message, 201);
});

exports.getAllUsers = asyncHandler(async (req, res) => {
  const users = await userService.getAllUsers();
  return sendSuccess(res, users);
});

exports.deleteUser = asyncHandler(async (req, res) => {
  const result = await userService.deleteUser(req.validated.params.id);
  return sendSuccess(res, null, result.message);
});

exports.createProject = asyncHandler(async (req, res) => {
  const result = await projectService.createProject(req.validated.body);
  const { data, message } = extractResultPayload(result, "Project created successfully");
  return sendSuccess(res, data, message, 201);
});

exports.getAllProjects = asyncHandler(async (req, res) => {
  const projects = await projectService.getAllProjects();
  return sendSuccess(res, projects);
});

exports.getProjectById = asyncHandler(async (req, res) => {
  const result = await projectService.getProjectById(req.validated.params.id);
  const { data, message } = extractResultPayload(result, "Project fetched successfully");
  return sendSuccess(res, data, message);
});

exports.updateProject = asyncHandler(async (req, res) => {
  const result = await projectService.updateProject(req.validated.params.id, req.validated.body);
  const { data, message } = extractResultPayload(result, "Project updated successfully");
  return sendSuccess(res, data, message);
});

exports.deleteProject = asyncHandler(async (req, res) => {
  const result = await projectService.deleteProject(req.validated.params.projectId);
  const { message, ...data } = result;
  return sendSuccess(res, data, message);
});

exports.getAllDailyTasks = asyncHandler(async (req, res) => {
  const tasks = await taskService.getAllDailyTasks(req.validated.query);
  return sendSuccess(res, tasks);
});

exports.getAllMonthlyTasks = asyncHandler(async (req, res) => {
  const tasks = await taskService.getAllMonthlyTasks(req.validated.query);
  return sendSuccess(res, tasks);
});

exports.getProjectTasks = asyncHandler(async (req, res) => {
  const result = await taskService.getAdminProjectTasks(req.validated.params.projectId);
  return sendSuccess(res, result);
});

exports.getTaskStats = asyncHandler(async (req, res) => {
  const result = await statsService.getAdminTaskStats(req.validated.query);
  const { data, message } = extractResultPayload(result, "Task stats fetched successfully");
  return sendSuccess(res, data, message);
});

exports.getProjectStats = asyncHandler(async (req, res) => {
  const result = await statsService.getAdminProjectStats(
    req.validated.params.projectId,
    req.validated.query
  );
  const { data, message } = extractResultPayload(result, "Project task stats fetched successfully");
  return sendSuccess(res, data, message);
});
