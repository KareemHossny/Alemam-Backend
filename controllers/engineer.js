const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const DailyTask = require("../models/dailyTask");
const MonthlyTask = require("../models/monthlyTask");
const Project = require("../models/Project");

// Engineer Login
exports.engineerLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.role !== "engineer") {
      return res.status(403).json({ message: "Access denied. Engineer account required." });
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

    console.log(`Engineer login successful: ${user.email}`);
    res.json({
      message: "Engineer login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error("Engineer login error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Engineer Logout
exports.engineerLogout = (req, res) => {
  res.json({ message: "Engineer logout successful" });
};

// Get Engineer Projects
exports.getEngineerProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      engineers: req.user.id
    }).select("name scopeOfWork engineers supervisors");

    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: "Error fetching engineer projects" });
  }
};

// Engineer Daily Tasks
exports.addDailyTask = async (req, res) => {
  try {
    const { projectId, title, note } = req.body;

    // التحقق من أن المشروع موجود وأن المهندس معين فيه
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (!project.engineers.includes(req.user.id)) {
      return res.status(403).json({ message: "You are not assigned to this project" });
    }

    const task = await DailyTask.create({
      project: projectId,
      createdBy: req.user.id,
      title,
      note
    });

    console.log(`Engineer created daily task: ${task._id}`);
    res.status(201).json(task);
  } catch (err) {
    console.error("Error creating daily task:", err);
    res.status(500).json({ message: "Error creating daily task" });
  }
};

exports.getDailyTasks = async (req, res) => {
  try {
    const { projectId } = req.params;

    // التحقق من أن المهندس معين في المشروع
    const project = await Project.findById(projectId);
    if (!project || !project.engineers.includes(req.user.id)) {
      return res.status(403).json({ message: "Access denied to this project" });
    }

    const tasks = await DailyTask.find({ project: projectId })
      .populate("createdBy", "name email")
      .populate("reviewedBy", "name email") // تم التحديث
      .sort({ createdAt: -1 });
    
    res.json(tasks);
  } catch (err) {
    console.error("Error fetching daily tasks:", err);
    res.status(500).json({ message: "Error fetching daily tasks" });
  }
};

exports.deleteDailyTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await DailyTask.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Daily task not found" });
    }

    // التحقق من أن المهندس هو من أنشأ المهمة
    if (task.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "You can only delete your own tasks" });
    }

    await DailyTask.findByIdAndDelete(taskId);
    res.json({ message: "Daily task deleted successfully" });
  } catch (err) {
    console.error("Error deleting daily task:", err);
    res.status(500).json({ message: "Error deleting daily task" });
  }
};

// Engineer Monthly Tasks
exports.addMonthlyTask = async (req, res) => {
  try {
    const { projectId, title, note, date } = req.body;

    // التحقق من أن المشروع موجود وأن المهندس معين فيه
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (!project.engineers.includes(req.user.id)) {
      return res.status(403).json({ message: "You are not assigned to this project" });
    }

    const task = await MonthlyTask.create({
      project: projectId,
      createdBy: req.user.id,
      title,
      note,
      date: new Date(date)
    });

    console.log(`Engineer created monthly task: ${task._id}`);
    res.status(201).json(task);
  } catch (err) {
    console.error("Error creating monthly task:", err);
    res.status(500).json({ message: "Error creating monthly task" });
  }
};

exports.getMonthlyTasks = async (req, res) => {
  try {
    const { projectId } = req.params;

    // التحقق من أن المهندس معين في المشروع
    const project = await Project.findById(projectId);
    if (!project || !project.engineers.includes(req.user.id)) {
      return res.status(403).json({ message: "Access denied to this project" });
    }

    const tasks = await MonthlyTask.find({ project: projectId })
      .populate("createdBy", "name email")
      .populate("reviewedBy", "name email") // تم التحديث
      .sort({ date: -1 });
    
    res.json(tasks);
  } catch (err) {
    console.error("Error fetching monthly tasks:", err);
    res.status(500).json({ message: "Error fetching monthly tasks" });
  }
};

exports.deleteMonthlyTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await MonthlyTask.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Monthly task not found" });
    }

    // التحقق من أن المهندس هو من أنشأ المهمة
    if (task.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "You can only delete your own tasks" });
    }

    await MonthlyTask.findByIdAndDelete(taskId);
    res.json({ message: "Monthly task deleted successfully" });
  } catch (err) {
    console.error("Error deleting monthly task:", err);
    res.status(500).json({ message: "Error deleting monthly task" });
  }
};