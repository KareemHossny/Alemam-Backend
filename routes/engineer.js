const express = require("express");
const router = express.Router();
const engineerController = require("../controllers/engineer");
const auth = require("../middlewares/auth");
const authorize = require("../middlewares/authorize");

// Public routes 
router.post("/login", engineerController.engineerLogin);
router.post("/logout", engineerController.engineerLogout);

// Protected routes 
router.use(auth);
router.use(authorize(["engineer"]));

// Projects
router.get("/projects", engineerController.getEngineerProjects);

// Daily Tasks
router.post("/daily-tasks", engineerController.addDailyTask);
router.get("/daily-tasks/:projectId", engineerController.getDailyTasks);
router.delete("/daily-tasks/:taskId", engineerController.deleteDailyTask);

// Monthly Tasks
router.post("/monthly-tasks", engineerController.addMonthlyTask);
router.get("/monthly-tasks/:projectId", engineerController.getMonthlyTasks);
router.delete("/monthly-tasks/:taskId", engineerController.deleteMonthlyTask);

module.exports = router;