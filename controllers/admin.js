const authService = require("../src/services/auth.service");
const projectService = require("../src/services/project.service");
const taskService = require("../src/services/task.service");
const statsService = require("../src/services/stats.service");
const userService = require("../src/modules/user/user.service");
const { getAuthCookieConfig } = require("../src/utils/authCookie");
const logger = require("../src/utils/logger");
const AppError = require("../src/utils/AppError");
const { sendSuccess, sendError, extractResultPayload } = require("../src/utils/response");
const asyncHandler = require("../middlewares/asyncHandler");

const ADMIN_COOKIE_CONFIG = getAuthCookieConfig("admin");

exports.bootstrapAdmin = asyncHandler(async (req, res) => {
  const result = await userService.bootstrapAdmin(req.validated.body);
  return sendSuccess(res, { user: result.user }, result.message, 201);
});

exports.adminLogin = asyncHandler(async (req, res) => {
  const requestContext = logger.getRequestContext(req);

  try {
    req.log?.debug(
      logger.compactObject({
        event: "auth.login.admin.start",
        role: "admin",
        email: req.validated.body?.email,
        ...requestContext,
      }),
      "admin login request received"
    );

    const result = await authService.loginAdmin(req.validated.body, requestContext);
    const { token, message, user } = result;

    req.log?.debug(
      logger.compactObject({
        event: "auth.login.admin.token_issued",
        role: "admin",
        hasToken: Boolean(token),
        cookieName: ADMIN_COOKIE_CONFIG.name,
        cookiePath: ADMIN_COOKIE_CONFIG.setOptions.path,
        sameSite: ADMIN_COOKIE_CONFIG.setOptions.sameSite,
        secure: ADMIN_COOKIE_CONFIG.setOptions.secure,
        ...requestContext,
      }),
      "admin login token generated"
    );

    res.cookie(ADMIN_COOKIE_CONFIG.name, token, ADMIN_COOKIE_CONFIG.setOptions);

    req.log?.info(
      logger.compactObject({
        event: "auth.login.admin.success",
        role: "admin",
        email: user?.email,
        cookieName: ADMIN_COOKIE_CONFIG.name,
        ...requestContext,
      }),
      "admin login response sent"
    );

    return sendSuccess(res, { user }, message);
  } catch (error) {
    req.log?.error(
      logger.compactObject({
        event: "auth.login.admin.failure",
        role: "admin",
        email: req.validated.body?.email,
        errorName: error?.name,
        errorMessage: error?.message,
        errorCode: error?.code,
        statusCode: error?.statusCode,
        ...requestContext,
      }),
      "admin login failed"
    );

    if (error instanceof AppError) {
      throw error;
    }

    return sendError(
      res,
      new AppError("Login failed", 500, {
        code: "LOGIN_ERROR",
      })
    );
  }
});

exports.adminLogout = asyncHandler(async (req, res) => {
  const result = authService.logout("Logout successful");

  res.clearCookie(ADMIN_COOKIE_CONFIG.name, ADMIN_COOKIE_CONFIG.clearOptions);
  req.log?.info({ event: "auth.logout", role: "admin" }, "admin logout");

  return sendSuccess(res, null, result.message);
});

exports.getCurrentAdminUser = asyncHandler(async (req, res) => {
  const result = await authService.getCurrentAdminUser(req.user);
  return sendSuccess(res, result.user, result.message);
});

exports.getDashboardStats = asyncHandler(async (req, res) => {
  const result = await statsService.getAdminDashboardStats();
  const { data, message } = extractResultPayload(result, "Admin dashboard stats fetched successfully");
  return sendSuccess(res, data, message);
});

exports.createProject = asyncHandler(async (req, res) => {
  const result = await projectService.createProject(req.validated.body, req.user);
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
  const result = await projectService.updateProject(req.validated.params.id, req.validated.body, req.user);
  const { data, message } = extractResultPayload(result, "Project updated successfully");
  return sendSuccess(res, data, message);
});

exports.deleteProject = asyncHandler(async (req, res) => {
  const result = await projectService.deleteProject(req.validated.params.projectId, req.user);
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
  const result = await taskService.getAdminProjectTasks(
    req.validated.params.projectId,
    req.validated.query
  );
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
