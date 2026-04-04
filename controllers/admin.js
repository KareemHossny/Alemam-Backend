const authService = require("../src/services/auth.service");
const userService = require("../src/services/user.service");
const projectService = require("../src/services/project.service");
const taskService = require("../src/services/task.service");

exports.adminLogin = async (req, res) => {
  const result = await authService.loginAdmin(req.validated.body);
  return res.json(result);
};

exports.adminLogout = (req, res) => {
  return res.json(authService.logout("Logout successful"));
};

exports.createUser = async (req, res) => {
  const result = await userService.createUser(req.validated.body);
  return res.status(201).json(result);
};

exports.getAllUsers = async (req, res) => {
  const users = await userService.getAllUsers();
  return res.json(users);
};

exports.deleteUser = async (req, res) => {
  const result = await userService.deleteUser(req.validated.params.id);
  return res.json(result);
};

exports.createProject = async (req, res) => {
  const result = await projectService.createProject(req.validated.body);
  return res.status(201).json(result);
};

exports.getAllProjects = async (req, res) => {
  const projects = await projectService.getAllProjects();
  return res.json(projects);
};

exports.getProjectById = async (req, res) => {
  const result = await projectService.getProjectById(req.validated.params.id);
  return res.json(result);
};

exports.updateProject = async (req, res) => {
  const result = await projectService.updateProject(req.validated.params.id, req.validated.body);
  return res.json(result);
};

exports.deleteProject = async (req, res) => {
  const result = await projectService.deleteProject(req.validated.params.projectId);
  return res.json(result);
};

exports.getAllDailyTasks = async (req, res) => {
  const tasks = await taskService.getAllDailyTasks();
  return res.json(tasks);
};

exports.getAllMonthlyTasks = async (req, res) => {
  const tasks = await taskService.getAllMonthlyTasks();
  return res.json(tasks);
};

exports.getProjectTasks = async (req, res) => {
  const result = await taskService.getAdminProjectTasks(req.validated.params.projectId);
  return res.json(result);
};
