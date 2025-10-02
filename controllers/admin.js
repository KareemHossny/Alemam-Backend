const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Project = require("../models/Project");

// Admin Login
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
      const token = jwt.sign(
        { role: "admin" }, 
        process.env.JWT_SECRET, 
        { expiresIn: "24h" }
      );

      res.json({
        message: "Login successful",
        token,
        user: { role: "admin" }
      });
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Admin Logout
exports.adminLogout = (req, res) => {
  res.json({ message: "Logout successful" });
};

// Create User
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role
    });

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Error creating user" });
  }
};

// Get All Users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Error fetching users" });
  }
};

// Delete User
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting user" });
  }
};

// Create Project
exports.createProject = async (req, res) => {
  try {
    const { name, scopeOfWork, engineers, supervisors } = req.body;

    if (!name || !scopeOfWork) {
      return res.status(400).json({ message: "Name and scope of work are required" });
    }

    const project = await Project.create({
      name,
      scopeOfWork,
      engineers: engineers || [],
      supervisors: supervisors || []
    });

    res.status(201).json({
      message: "Project created successfully",
      project
    });
  } catch (err) {
    res.status(500).json({ message: "Error creating project" });
  }
};

// Get All Projects
exports.getAllProjects = async (req, res) => {
  try {
    const projects = await Project.find()
      .populate("engineers", "name email")
      .populate("supervisors", "name email");
    
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: "Error fetching projects" });
  }
};

// Update Project
exports.updateProject = async (req, res) => {
  try {
    const { name, scopeOfWork, engineers, supervisors } = req.body;

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (name) project.name = name;
    if (scopeOfWork) project.scopeOfWork = scopeOfWork;
    if (engineers) project.engineers = engineers;
    if (supervisors) project.supervisors = supervisors;

    await project.save();
    res.json({ message: "Project updated successfully", project });
  } catch (err) {
    res.status(500).json({ message: "Error updating project" });
  }
};

// Delete Project
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: "Project deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting project" });
  }
};

const DailyTask = require("../models/dailyTask");
const MonthlyTask = require("../models/monthlyTask");

// Get All Daily Tasks
exports.getAllDailyTasks = async (req, res) => {
  try {
    const tasks = await DailyTask.find()
      .populate("project", "name scopeOfWork")
      .populate("createdBy", "name email role")
      .populate("reviewedBy", "name email") 
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (err) {
    console.error("Error fetching daily tasks:", err);
    res.status(500).json({ message: "Error fetching daily tasks" });
  }
};

// Get All Monthly Tasks
exports.getAllMonthlyTasks = async (req, res) => {
  try {
    const tasks = await MonthlyTask.find()
      .populate("project", "name scopeOfWork")
      .populate("createdBy", "name email role")
      .populate("reviewedBy", "name email") 
      .sort({ date: -1 });

    res.json(tasks);
  } catch (err) {
    console.error("Error fetching monthly tasks:", err);
    res.status(500).json({ message: "Error fetching monthly tasks" });
  }
};

// Get Tasks for Specific Project
exports.getProjectTasks = async (req, res) => {
  try {
    const { projectId } = req.params;

    const [dailyTasks, monthlyTasks] = await Promise.all([
      DailyTask.find({ project: projectId })
        .populate("createdBy", "name email role")
        .populate("reviewedBy", "name email") 
        .sort({ createdAt: -1 }),
      MonthlyTask.find({ project: projectId })
        .populate("createdBy", "name email role")
        .populate("reviewedBy", "name email")  
        .sort({ date: -1 })
    ]);

    res.json({
      dailyTasks,
      monthlyTasks,
      project: await Project.findById(projectId).select("name scopeOfWork")
    });
  } catch (err) {
    console.error("Error fetching project tasks:", err);
    res.status(500).json({ message: "Error fetching project tasks" });
  }
};