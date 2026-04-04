const authService = require("../src/services/auth.service");
const projectService = require("../src/services/project.service");
const taskService = require("../src/services/task.service");
const { getAuthCookieConfig } = require("../src/utils/authCookie");

const SUPERVISOR_COOKIE_CONFIG = getAuthCookieConfig("supervisor");

exports.supervisorLogin = async (req, res) => {
  const result = await authService.loginSupervisor(req.validated.body);
  const { token, ...responseBody } = result;

  res.cookie(SUPERVISOR_COOKIE_CONFIG.name, token, SUPERVISOR_COOKIE_CONFIG.setOptions);

  return res.json(responseBody);
};

exports.supervisorLogout = (req, res) => {
  res.clearCookie(SUPERVISOR_COOKIE_CONFIG.name, SUPERVISOR_COOKIE_CONFIG.clearOptions);
  return res.json(authService.logout("Supervisor logout successful"));
};

exports.getCurrentSupervisorUser = async (req, res) => {
  const result = await authService.getCurrentSupervisorUser(req.user);
  return res.json(result);
};

exports.getSupervisorProjects = async (req, res) => {
  const projects = await projectService.getSupervisorProjects(req.user.id);
  return res.json(projects);
};

exports.getDailyTasks = async (req, res) => {
  const tasks = await taskService.getSupervisorDailyTasks(req.validated.params.projectId, req.user, req.validated.query);
  return res.json(tasks);
};

exports.reviewDailyTask = async (req, res) => {
  const result = await taskService.reviewDailyTask(req.validated.params.taskId, req.validated.body, req.user);
  return res.json(result);
};

exports.getMonthlyTasks = async (req, res) => {
  const tasks = await taskService.getSupervisorMonthlyTasks(req.validated.params.projectId, req.user);
  return res.json(tasks);
};

exports.reviewMonthlyTask = async (req, res) => {
  const result = await taskService.reviewMonthlyTask(req.validated.params.taskId, req.validated.body, req.user);
  return res.json(result);
};
