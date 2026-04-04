const authService = require("../src/services/auth.service");
const projectService = require("../src/services/project.service");
const taskService = require("../src/services/task.service");

exports.supervisorLogin = async (req, res) => {
  const result = await authService.loginSupervisor(req.validated.body);
  return res.json(result);
};

exports.supervisorLogout = (req, res) => {
  return res.json(authService.logout("Supervisor logout successful"));
};

exports.getSupervisorProjects = async (req, res) => {
  const projects = await projectService.getSupervisorProjects(req.user.id);
  return res.json(projects);
};

exports.getDailyTasks = async (req, res) => {
  const tasks = await taskService.getSupervisorDailyTasks(req.validated.params.projectId, req.user);
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
