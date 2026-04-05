const express = require("express");
const router = express.Router();
const engineerController = require("../controllers/engineer");
const auth = require("../middlewares/auth");
const { authorizeRoles } = require("../middlewares/authorize");
const { authRateLimiters } = require("../middlewares/authRateLimit");
const validate = require("../middlewares/validate");
const { authorizeProjectAccess, authorizeTaskAction } = require("../src/core/middleware/ownership");
const { loginSchema, logoutSchema, currentUserSchema } = require("../src/validators/auth.validator");
const { listProjectsSchema } = require("../src/validators/project.validator");
const { dashboardStatsSchema } = require("../src/validators/stats.validator");
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
router.use(authorizeRoles("engineer"));

// Projects
router.get("/me", validate(currentUserSchema), engineerController.getCurrentEngineerUser);
router.get("/projects", validate(listProjectsSchema), engineerController.getEngineerProjects);
router.get("/dashboard/stats", validate(dashboardStatsSchema), engineerController.getDashboardStats);

// Daily Tasks
router.post("/daily-tasks", validate(createDailyTaskSchema), authorizeProjectAccess({ source: "body" }), engineerController.addDailyTask);
router.post(
  "/daily-tasks/bulk",
  validate(createDailyTasksBulkSchema),
  authorizeProjectAccess({
    source: "body",
    getProjectIds: (tasks = []) => tasks.map((task) => task.projectId),
  }),
  engineerController.addDailyTasksBulk
);
router.get(
  "/daily-tasks/:projectId",
  validate(getDailyTasksByProjectSchema),
  authorizeProjectAccess({ source: "params" }),
  engineerController.getDailyTasks
);
router.delete(
  "/daily-tasks/:taskId",
  validate(deleteTaskSchema),
  authorizeTaskAction({ taskType: "daily", action: "delete" }),
  engineerController.deleteDailyTask
);

// Monthly Tasks
router.post("/monthly-tasks", validate(createMonthlyTaskSchema), authorizeProjectAccess({ source: "body" }), engineerController.addMonthlyTask);
router.post(
  "/monthly-tasks/bulk",
  validate(createMonthlyTasksBulkSchema),
  authorizeProjectAccess({
    source: "body",
    getProjectIds: (tasks = []) => tasks.map((task) => task.projectId),
  }),
  engineerController.addMonthlyTasksBulk
);
router.get(
  "/monthly-tasks/:projectId",
  validate(getTasksByProjectSchema),
  authorizeProjectAccess({ source: "params" }),
  engineerController.getMonthlyTasks
);
router.delete(
  "/monthly-tasks/:taskId",
  validate(deleteTaskSchema),
  authorizeTaskAction({ taskType: "monthly", action: "delete" }),
  engineerController.deleteMonthlyTask
);

module.exports = router;
