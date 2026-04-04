const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../../models/User");
const AppError = require("../utils/AppError");
const { hasRole } = require("../policies/role.policy");

const ROLE_CONFIG = {
  engineer: {
    successMessage: "Engineer login successful",
    forbiddenMessage: "Access denied. Engineer account required.",
    internalErrorMessage: "Internal server error",
  },
  supervisor: {
    successMessage: "Supervisor login successful",
    forbiddenMessage: "Access denied. Supervisor account required.",
    internalErrorMessage: "Internal server error",
  },
};

const generateToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "24h",
  });

const serializeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
});

const serializeAdminUser = () => ({
  role: "admin",
  email: process.env.ADMIN_EMAIL,
});

const loginAdmin = async ({ email, password }) => {
  try {
    if (email !== process.env.ADMIN_EMAIL || password !== process.env.ADMIN_PASSWORD) {
      throw new AppError("Invalid credentials", 401);
    }

    return {
      message: "Login successful",
      token: generateToken({ role: "admin" }),
      user: serializeAdminUser(),
    };
  } catch (error) {
    AppError.rethrow(error, "Server error");
  }
};

const loginRoleUser = async ({ email, password }, role) => {
  const config = ROLE_CONFIG[role];

  try {
    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError("Invalid email or password", 401);
    }

    if (!hasRole(user, role)) {
      throw new AppError(config.forbiddenMessage, 403);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError("Invalid email or password", 401);
    }

    console.log(`${role} login successful: ${user.email}`);

    return {
      message: config.successMessage,
      token: generateToken({
        id: user._id,
        role: user.role,
        name: user.name,
        email: user.email,
      }),
      user: serializeUser(user),
    };
  } catch (error) {
    AppError.rethrow(error, config.internalErrorMessage);
  }
};

const logout = (message) => ({ message });

const getCurrentAdminUser = async () => ({
  message: "Session active",
  user: serializeAdminUser(),
});

const getCurrentRoleUser = async (authUser, role) => {
  const config = ROLE_CONFIG[role];

  try {
    const user = await User.findById(authUser.id).select("_id name email role");
    if (!user) {
      throw new AppError("Session expired. Please log in again.", 401);
    }

    if (!hasRole(user, role)) {
      throw new AppError(config.forbiddenMessage, 403);
    }

    return {
      message: "Session active",
      user: serializeUser(user),
    };
  } catch (error) {
    AppError.rethrow(error, config.internalErrorMessage);
  }
};

module.exports = {
  loginAdmin,
  loginEngineer: (payload) => loginRoleUser(payload, "engineer"),
  loginSupervisor: (payload) => loginRoleUser(payload, "supervisor"),
  logout,
  getCurrentAdminUser,
  getCurrentEngineerUser: (authUser) => getCurrentRoleUser(authUser, "engineer"),
  getCurrentSupervisorUser: (authUser) => getCurrentRoleUser(authUser, "supervisor"),
};
