const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const DailyTask = require("../models/dailyTask");
const MonthlyTask = require("../models/monthlyTask");
const Project = require("../models/Project");

// Supervisor Login
exports.supervisorLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.role !== "supervisor") {
      return res.status(403).json({ message: "Access denied. Supervisor account required." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { 
        id: user._id, 
        role: user.role,
        name: user.name,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    console.log(`Supervisor login successful: ${user.email}`);
    res.json({
      message: "Supervisor login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error("Supervisor login error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Supervisor Logout
exports.supervisorLogout = (req, res) => {
  res.json({ message: "Supervisor logout successful" });
};

// Get Supervisor Projects
exports.getSupervisorProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      supervisors: req.user.id
    }).select("name scopeOfWork engineers supervisors")
      .populate("engineers", "name email")
      .populate("supervisors", "name email");

    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: "Error fetching supervisor projects" });
  }
};

// Supervisor Daily Tasks Review
exports.getDailyTasks = async (req, res) => {
  try {
    const { projectId } = req.params;

    // التحقق من أن المشرف مشرف على المشروع
    const project = await Project.findById(projectId);
    if (!project || !project.supervisors.includes(req.user.id)) {
      return res.status(403).json({ message: "Access denied to this project" });
    }

    const tasks = await DailyTask.find({ project: projectId })
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });
    
    res.json(tasks);
  } catch (err) {
    console.error("Error fetching daily tasks for review:", err);
    res.status(500).json({ message: "Error fetching daily tasks" });
  }
};

// Supervisor Daily Tasks Review
exports.reviewDailyTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status, supervisorNote } = req.body;

    const task = await DailyTask.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Daily task not found" });
    }

    // التحقق من أن المشرف مشرف على المشروع
    const project = await Project.findById(task.project);
    if (!project || !project.supervisors.includes(req.user.id)) {
      return res.status(403).json({ message: "Access denied to review this task" });
    }

    // تحديث المهمة مع معلومات المراجعة
    task.status = status || task.status;
    task.supervisorNote = supervisorNote || task.supervisorNote;
    task.reviewedBy = req.user.id; // إضافة المشرف الذي قام بالمراجعة
    task.reviewedAt = new Date(); // إضافة وقت المراجعة

    await task.save();
    
    console.log(`Supervisor ${req.user.id} reviewed daily task: ${taskId}`);
    res.json({ 
      message: "Daily task reviewed successfully", 
      task: await DailyTask.findById(taskId)
        .populate("createdBy", "name email role")
        .populate("reviewedBy", "name email")
    });
  } catch (err) {
    console.error("Error reviewing daily task:", err);
    res.status(500).json({ message: "Error reviewing daily task" });
  }
};

// Supervisor Monthly Tasks Review
exports.getMonthlyTasks = async (req, res) => {
  try {
    const { projectId } = req.params;

    // التحقق من أن المشرف مشرف على المشروع
    const project = await Project.findById(projectId);
    if (!project || !project.supervisors.includes(req.user.id)) {
      return res.status(403).json({ message: "Access denied to this project" });
    }

    const tasks = await MonthlyTask.find({ project: projectId })
      .populate("createdBy", "name email")
      .sort({ date: -1 });
    
    res.json(tasks);
  } catch (err) {
    console.error("Error fetching monthly tasks for review:", err);
    res.status(500).json({ message: "Error fetching monthly tasks" });
  }
};


// Supervisor Monthly Tasks Review
exports.reviewMonthlyTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status, supervisorNote } = req.body;

    const task = await MonthlyTask.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Monthly task not found" });
    }

    // التحقق من أن المشرف مشرف على المشروع
    const project = await Project.findById(task.project);
    if (!project || !project.supervisors.includes(req.user.id)) {
      return res.status(403).json({ message: "Access denied to review this task" });
    }

    // تحديث المهمة مع معلومات المراجعة
    task.status = status || task.status;
    task.supervisorNote = supervisorNote || task.supervisorNote;
    task.reviewedBy = req.user.id; // إضافة المشرف الذي قام بالمراجعة
    task.reviewedAt = new Date(); // إضافة وقت المراجعة

    await task.save();
    
    console.log(`Supervisor ${req.user.id} reviewed monthly task: ${taskId}`);
    res.json({ 
      message: "Monthly task reviewed successfully", 
      task: await MonthlyTask.findById(taskId)
        .populate("createdBy", "name email role")
        .populate("reviewedBy", "name email")
    });
  } catch (err) {
    console.error("Error reviewing monthly task:", err);
    res.status(500).json({ message: "Error reviewing monthly task" });
  }
};