const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin");
const auth = require("../middlewares/auth");
const authorize = require("../middlewares/authorize");

// Public routes
router.post("/login", adminController.adminLogin);
router.post("/logout", adminController.adminLogout);

// Protected routes
router.use(auth);
router.use(authorize(["admin"]));

// Users Management
router.get("/users", adminController.getAllUsers);
router.post("/users", adminController.createUser);
router.delete("/users/:id", adminController.deleteUser);

// Projects Management
router.get("/projects", adminController.getAllProjects);
router.get("/projects/:id", adminController.getProjectById);
router.post("/projects", adminController.createProject);
router.put("/projects/:id", adminController.updateProject);
router.delete("/projects/:projectId", adminController.deleteProject);

// Tasks Management - الجديد
router.get("/tasks/daily", adminController.getAllDailyTasks);
router.get("/tasks/monthly", adminController.getAllMonthlyTasks);
router.get("/tasks/project/:projectId", adminController.getProjectTasks);

module.exports = router;