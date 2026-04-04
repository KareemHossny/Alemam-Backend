const express = require("express");
const router = express.Router();
const supervisorController = require("../controllers/supervisor");
const auth = require("../middlewares/auth");
const authorize = require("../middlewares/authorize");
const { authRateLimiters } = require("../middlewares/authRateLimit");
const validate = require("../middlewares/validate");
const { loginSchema, logoutSchema, currentUserSchema } = require("../src/validators/auth.validator");
const { listProjectsSchema } = require("../src/validators/project.validator");
const { getDailyTasksByProjectSchema, getTasksByProjectSchema, reviewTaskSchema } = require("../src/validators/task.validator");

// Public routes 
router.post("/login", authRateLimiters.supervisorLogin, validate(loginSchema), supervisorController.supervisorLogin);
router.post("/logout", validate(logoutSchema), supervisorController.supervisorLogout);

// Protected routes 
router.use(auth);
router.use(authorize(["supervisor"]));

// Projects
router.get("/me", validate(currentUserSchema), supervisorController.getCurrentSupervisorUser);
router.get("/projects", validate(listProjectsSchema), supervisorController.getSupervisorProjects);

// Daily Tasks Review
router.get("/daily-tasks/:projectId", validate(getDailyTasksByProjectSchema), supervisorController.getDailyTasks);
router.put("/daily-tasks/:taskId/review", validate(reviewTaskSchema), supervisorController.reviewDailyTask);

// Monthly Tasks Review
router.get("/monthly-tasks/:projectId", validate(getTasksByProjectSchema), supervisorController.getMonthlyTasks);
router.put("/monthly-tasks/:taskId/review", validate(reviewTaskSchema), supervisorController.reviewMonthlyTask);

module.exports = router;
