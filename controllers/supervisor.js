const authService = require("../src/services/auth.service");
const projectService = require("../src/services/project.service");
const taskService = require("../src/services/task.service");
const statsService = require("../src/services/stats.service");
const { getAuthCookieConfig } = require("../src/utils/authCookie");
const logger = require("../src/utils/logger");
const { sendSuccess, extractResultPayload } = require("../src/utils/response");
const asyncHandler = require("../middlewares/asyncHandler");

const SUPERVISOR_COOKIE_CONFIG = getAuthCookieConfig("supervisor");

exports.supervisorLogin = asyncHandler(async (req, res) => {
  const result = await authService.loginSupervisor(req.validated.body, logger.getRequestContext(req));
  const { token, message, user } = result;

  res.cookie(SUPERVISOR_COOKIE_CONFIG.name, token, SUPERVISOR_COOKIE_CONFIG.setOptions);

  return sendSuccess(res, { user }, message);
});

exports.supervisorLogout = asyncHandler(async (req, res) => {
  const result = authService.logout("Supervisor logout successful");

  res.clearCookie(SUPERVISOR_COOKIE_CONFIG.name, SUPERVISOR_COOKIE_CONFIG.clearOptions);
  req.log?.info(
    logger.compactObject({
      event: "auth.logout",
      actorId: req.user?.id ? String(req.user.id) : undefined,
      role: "supervisor",
    }),
    "supervisor logout"
  );

  return sendSuccess(res, null, result.message);
});

exports.getCurrentSupervisorUser = asyncHandler(async (req, res) => {
  const result = await authService.getCurrentSupervisorUser(req.user);
  return sendSuccess(res, { user: result.user }, result.message);
});

exports.getSupervisorProjects = asyncHandler(async (req, res) => {
  const projects = await projectService.getSupervisorProjects(req.user.id);
  return sendSuccess(res, projects);
});

exports.getDailyTasks = asyncHandler(async (req, res) => {
  const tasks = await taskService.getSupervisorDailyTasks(req.validated.params.projectId, req.user, req.validated.query);
  return sendSuccess(res, tasks);
});

exports.reviewDailyTask = asyncHandler(async (req, res) => {
  const result = await taskService.reviewDailyTask(req.validated.params.taskId, req.validated.body, req.user);
  return sendSuccess(res, { task: result.task }, result.message);
});

exports.getMonthlyTasks = asyncHandler(async (req, res) => {
  const tasks = await taskService.getSupervisorMonthlyTasks(req.validated.params.projectId, req.user, req.validated.query);
  return sendSuccess(res, tasks);
});

exports.reviewMonthlyTask = asyncHandler(async (req, res) => {
  const result = await taskService.reviewMonthlyTask(req.validated.params.taskId, req.validated.body, req.user);
  return sendSuccess(res, { task: result.task }, result.message);
});

exports.getDashboardStats = asyncHandler(async (req, res) => {
  const result = await statsService.getSupervisorDashboardStats(req.user);
  const { data, message } = extractResultPayload(result, "Supervisor dashboard stats fetched successfully");
  return sendSuccess(res, data, message);
});

exports.getProjectStats = asyncHandler(async (req, res) => {
  const result = await statsService.getSupervisorProjectStats(req.user);
  const { data, message } = extractResultPayload(result, "Supervisor project stats fetched successfully");
  return sendSuccess(res, data, message);
});
