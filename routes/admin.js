const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin");
const auth = require("../middlewares/auth");
const authorize = require("../middlewares/authorize");
const { authRateLimiters } = require("../middlewares/authRateLimit");
const validate = require("../middlewares/validate");
const { loginSchema, logoutSchema, currentUserSchema } = require("../src/validators/auth.validator");
const { adminTaskStatsSchema, adminProjectStatsSchema } = require("../src/validators/stats.validator");
const {
  createProjectSchema,
  projectByIdSchema,
  updateProjectSchema,
  deleteProjectSchema,
  getProjectTasksSchema,
  listProjectsSchema,
} = require("../src/validators/project.validator");
const { createUserSchema, deleteUserSchema, listUsersSchema } = require("../src/validators/user.validator");
const { listTasksSchema } = require("../src/validators/task.validator");

// Public routes
router.post("/login", authRateLimiters.adminLogin, validate(loginSchema), adminController.adminLogin);
router.post("/logout", validate(logoutSchema), adminController.adminLogout);

// Protected routes
router.use(auth);
router.use(authorize(["admin"]));

// Users Management
router.get("/me", validate(currentUserSchema), adminController.getCurrentAdminUser);
router.get("/users", validate(listUsersSchema), adminController.getAllUsers);
router.post("/users", validate(createUserSchema), adminController.createUser);
router.delete("/users/:id", validate(deleteUserSchema), adminController.deleteUser);

// Projects Management
router.get("/projects", validate(listProjectsSchema), adminController.getAllProjects);
router.get("/projects/:projectId/stats", validate(adminProjectStatsSchema), adminController.getProjectStats);
router.get("/projects/:id", validate(projectByIdSchema), adminController.getProjectById);
router.post("/projects", validate(createProjectSchema), adminController.createProject);
router.put("/projects/:id", validate(updateProjectSchema), adminController.updateProject);
router.delete("/projects/:projectId", validate(deleteProjectSchema), adminController.deleteProject);

// Tasks Management - الجديد
router.get("/tasks/stats", validate(adminTaskStatsSchema), adminController.getTaskStats);
router.get("/tasks/daily", validate(listTasksSchema), adminController.getAllDailyTasks);
router.get("/tasks/monthly", validate(listTasksSchema), adminController.getAllMonthlyTasks);
router.get("/tasks/project/:projectId", validate(getProjectTasksSchema), adminController.getProjectTasks);

module.exports = router;
