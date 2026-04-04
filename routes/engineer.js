const express = require("express");
const router = express.Router();
const engineerController = require("../controllers/engineer");
const auth = require("../middlewares/auth");
const authorize = require("../middlewares/authorize");
const validate = require("../middlewares/validate");
const { loginSchema, logoutSchema } = require("../src/validators/auth.validator");
const { listProjectsSchema } = require("../src/validators/project.validator");
const {
  createDailyTaskSchema,
  createMonthlyTaskSchema,
  getTasksByProjectSchema,
  deleteTaskSchema,
} = require("../src/validators/task.validator");

// Public routes 
router.post("/login", validate(loginSchema), engineerController.engineerLogin);
router.post("/logout", validate(logoutSchema), engineerController.engineerLogout);

// Protected routes 
router.use(auth);
router.use(authorize(["engineer"]));

// Projects
router.get("/projects", validate(listProjectsSchema), engineerController.getEngineerProjects);

// Daily Tasks
router.post("/daily-tasks", validate(createDailyTaskSchema), engineerController.addDailyTask);
router.get("/daily-tasks/:projectId", validate(getTasksByProjectSchema), engineerController.getDailyTasks);
router.delete("/daily-tasks/:taskId", validate(deleteTaskSchema), engineerController.deleteDailyTask);

// Monthly Tasks
router.post("/monthly-tasks", validate(createMonthlyTaskSchema), engineerController.addMonthlyTask);
router.get("/monthly-tasks/:projectId", validate(getTasksByProjectSchema), engineerController.getMonthlyTasks);
router.delete("/monthly-tasks/:taskId", validate(deleteTaskSchema), engineerController.deleteMonthlyTask);

module.exports = router;
