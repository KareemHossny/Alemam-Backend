const express = require("express");
const router = express.Router();
const engineerController = require("../controllers/engineer");
const auth = require("../middlewares/auth");
const authorize = require("../middlewares/authorize");
const { authRateLimiters } = require("../middlewares/authRateLimit");
const validate = require("../middlewares/validate");
const { loginSchema, logoutSchema, currentUserSchema } = require("../src/validators/auth.validator");
const { listProjectsSchema } = require("../src/validators/project.validator");
const {
  createDailyTaskSchema,
  createDailyTasksBulkSchema,
  createMonthlyTaskSchema,
  createMonthlyTasksBulkSchema,
  getDailyTasksByProjectSchema,
  getTasksByProjectSchema,
  deleteTaskSchema,
} = require("../src/validators/task.validator");

// Public routes 
router.post("/login", authRateLimiters.engineerLogin, validate(loginSchema), engineerController.engineerLogin);
router.post("/logout", validate(logoutSchema), engineerController.engineerLogout);

// Protected routes 
router.use(auth);
router.use(authorize(["engineer"]));

// Projects
router.get("/me", validate(currentUserSchema), engineerController.getCurrentEngineerUser);
router.get("/projects", validate(listProjectsSchema), engineerController.getEngineerProjects);

// Daily Tasks
router.post("/daily-tasks", validate(createDailyTaskSchema), engineerController.addDailyTask);
router.post("/daily-tasks/bulk", validate(createDailyTasksBulkSchema), engineerController.addDailyTasksBulk);
router.get("/daily-tasks/:projectId", validate(getDailyTasksByProjectSchema), engineerController.getDailyTasks);
router.delete("/daily-tasks/:taskId", validate(deleteTaskSchema), engineerController.deleteDailyTask);

// Monthly Tasks
router.post("/monthly-tasks", validate(createMonthlyTaskSchema), engineerController.addMonthlyTask);
router.post("/monthly-tasks/bulk", validate(createMonthlyTasksBulkSchema), engineerController.addMonthlyTasksBulk);
router.get("/monthly-tasks/:projectId", validate(getTasksByProjectSchema), engineerController.getMonthlyTasks);
router.delete("/monthly-tasks/:taskId", validate(deleteTaskSchema), engineerController.deleteMonthlyTask);

module.exports = router;
