const express = require("express");
const router = express.Router();
const supervisorController = require("../controllers/supervisor");
const auth = require("../middlewares/auth");
const authorize = require("../middlewares/authorize");

// Public routes 
router.post("/login", supervisorController.supervisorLogin);
router.post("/logout", supervisorController.supervisorLogout);

// Protected routes 
router.use(auth);
router.use(authorize(["supervisor"]));

// Projects
router.get("/projects", supervisorController.getSupervisorProjects);

// Daily Tasks Review
router.get("/daily-tasks/:projectId", supervisorController.getDailyTasks);
router.put("/daily-tasks/:taskId/review", supervisorController.reviewDailyTask);

// Monthly Tasks Review
router.get("/monthly-tasks/:projectId", supervisorController.getMonthlyTasks);
router.put("/monthly-tasks/:taskId/review", supervisorController.reviewMonthlyTask);

module.exports = router;