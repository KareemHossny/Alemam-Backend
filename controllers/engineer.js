const authService = require("../src/services/auth.service");
const projectService = require("../src/services/project.service");
const taskService = require("../src/services/task.service");

exports.engineerLogin = async (req, res) => {
  const result = await authService.loginEngineer(req.validated.body);
  return res.json(result);
};

exports.engineerLogout = (req, res) => {
  return res.json(authService.logout("Engineer logout successful"));
};

exports.getEngineerProjects = async (req, res) => {
  const projects = await projectService.getEngineerProjects(req.user.id);
  return res.json(projects);
};

exports.addDailyTask = async (req, res) => {
  const task = await taskService.createDailyTask(req.validated.body, req.user);
  return res.status(201).json(task);
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

exports.getMonthlyTasks = async (req, res) => {
  const tasks = await taskService.getEngineerMonthlyTasks(req.validated.params.projectId, req.user);
  return res.json(tasks);
};

exports.deleteMonthlyTask = async (req, res) => {
  const result = await taskService.deleteMonthlyTask(req.validated.params.taskId, req.user);
  return res.json(result);
};
