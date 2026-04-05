const authService = require("../src/services/auth.service");
const projectService = require("../src/services/project.service");
const taskService = require("../src/services/task.service");
const { getAuthCookieConfig } = require("../src/utils/authCookie");

const ENGINEER_COOKIE_CONFIG = getAuthCookieConfig("engineer");

exports.engineerLogin = async (req, res) => {
  const result = await authService.loginEngineer(req.validated.body);
  const { token, ...responseBody } = result;

  res.cookie(ENGINEER_COOKIE_CONFIG.name, token, ENGINEER_COOKIE_CONFIG.setOptions);

  return res.json(responseBody);
};

exports.engineerLogout = (req, res) => {
  res.clearCookie(ENGINEER_COOKIE_CONFIG.name, ENGINEER_COOKIE_CONFIG.clearOptions);
  return res.json(authService.logout("Engineer logout successful"));
};

exports.getCurrentEngineerUser = async (req, res) => {
  const result = await authService.getCurrentEngineerUser(req.user);
  return res.json(result);
};

exports.getEngineerProjects = async (req, res) => {
  const projects = await projectService.getEngineerProjects(req.user.id);
  return res.json(projects);
};

exports.addDailyTask = async (req, res) => {
  const task = await taskService.createDailyTask(req.validated.body, req.user);
  return res.status(201).json(task);
};

exports.addDailyTasksBulk = async (req, res) => {
  const { statusCode, ...result } = await taskService.createDailyTasksBulk(req.validated.body, req.user);
  return res.status(statusCode).json(result);
};

exports.getDailyTasks = async (req, res) => {
  const tasks = await taskService.getEngineerDailyTasks(req.validated.params.projectId, req.user, req.validated.query);
  return res.json(tasks);
};

exports.deleteDailyTask = async (req, res) => {
  const result = await taskService.deleteDailyTask(req.validated.params.taskId, req.user);
  return res.json(result);
};

exports.addMonthlyTask = async (req, res) => {
  const task = await taskService.createMonthlyTask(req.validated.body, req.user);
  return res.status(201).json(task);
};

exports.addMonthlyTasksBulk = async (req, res) => {
  const { statusCode, ...result } = await taskService.createMonthlyTasksBulk(req.validated.body, req.user);
  return res.status(statusCode).json(result);
};

exports.getMonthlyTasks = async (req, res) => {
  const tasks = await taskService.getEngineerMonthlyTasks(req.validated.params.projectId, req.user, req.validated.query);
  return res.json(tasks);
};

exports.deleteMonthlyTask = async (req, res) => {
  const result = await taskService.deleteMonthlyTask(req.validated.params.taskId, req.user);
  return res.json(result);
};
