const express = require("express");
const router = express.Router();
const supervisorController = require("../controllers/supervisor");
const auth = require("../middlewares/auth");
const { authorizeRoles } = require("../middlewares/authorize");
const { authRateLimiters } = require("../middlewares/authRateLimit");
const validate = require("../middlewares/validate");
const { authorizeProjectAccess, authorizeTaskAction } = require("../src/core/middleware/ownership");
const { loginSchema, logoutSchema, currentUserSchema } = require("../src/validators/auth.validator");
const { listProjectsSchema } = require("../src/validators/project.validator");
const { dashboardStatsSchema, supervisorProjectStatsSchema } = require("../src/validators/stats.validator");
const { getDailyTasksByProjectSchema, getTasksByProjectSchema, reviewTaskSchema } = require("../src/validators/task.validator");

// Public routes 
router.post("/login", authRateLimiters.supervisorLogin, validate(loginSchema), supervisorController.supervisorLogin);
router.post("/logout", validate(logoutSchema), supervisorController.supervisorLogout);

// Protected routes 
router.use(auth);
router.use(authorizeRoles("supervisor"));

// Projects
router.get("/me", validate(currentUserSchema), supervisorController.getCurrentSupervisorUser);
router.get("/projects", validate(listProjectsSchema), supervisorController.getSupervisorProjects);
router.get("/dashboard/stats", validate(dashboardStatsSchema), supervisorController.getDashboardStats);
router.get("/projects/stats", validate(supervisorProjectStatsSchema), supervisorController.getProjectStats);

// Daily Tasks Review
router.get(
  "/daily-tasks/:projectId",
  validate(getDailyTasksByProjectSchema),
  authorizeProjectAccess({ source: "params" }),
  supervisorController.getDailyTasks
);
router.put(
  "/daily-tasks/:taskId/review",
  validate(reviewTaskSchema),
  authorizeTaskAction({ taskType: "daily", action: "review" }),
  supervisorController.reviewDailyTask
);

// Monthly Tasks Review
router.get(
  "/monthly-tasks/:projectId",
  validate(getTasksByProjectSchema),
  authorizeProjectAccess({ source: "params" }),
  supervisorController.getMonthlyTasks
);
router.put(
  "/monthly-tasks/:taskId/review",
  validate(reviewTaskSchema),
  authorizeTaskAction({ taskType: "monthly", action: "review" }),
  supervisorController.reviewMonthlyTask
);

module.exports = router;
