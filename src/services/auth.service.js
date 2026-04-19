const jwt = require("jsonwebtoken");
const config = require("../config");
const AppError = require("../utils/AppError");
const logger = require("../utils/logger");
const { hasRole } = require("../policies/role.policy");
const userRepository = require("../modules/user/user.repository");

const ROLE_CONFIG = {
  admin: {
    successMessage: "Admin login successful",
    forbiddenMessage: "Access denied. Admin account required.",
    internalErrorMessage: "Internal server error",
  },
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
  jwt.sign(payload, config.auth.jwtSecret, {
    algorithm: "HS256",
    expiresIn: config.auth.jwtExpiresIn,
  });

const serializeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
});

const loginRoleUser = async ({ email, password }, role, requestContext = {}) => {
  const roleConfig = ROLE_CONFIG[role];
  const normalizedEmail = String(email || "").trim().toLowerCase();

  try {
    const user = await userRepository.findByEmailForAuth(normalizedEmail);

    if (!user) {
      logger.logAuthAttempt({
        outcome: "failed",
        role,
        email: normalizedEmail,
        reason: "User not found",
        request: requestContext,
      });

      throw new AppError("Invalid email or password", 401);
    }

    if (!hasRole(user, role)) {
      logger.logAuthAttempt({
        outcome: "failed",
        role,
        email: normalizedEmail,
        userId: user._id,
        reason: roleConfig.forbiddenMessage,
        request: requestContext,
      });

      throw new AppError(roleConfig.forbiddenMessage, 403);
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      logger.logAuthAttempt({
        outcome: "failed",
        role,
        email: normalizedEmail,
        userId: user._id,
        reason: "Invalid password",
        request: requestContext,
      });

      throw new AppError("Invalid email or password", 401);
    }

    logger.logAuthAttempt({
      outcome: "success",
      role,
      email: user.email,
      userId: user._id,
      request: requestContext,
    });

    return {
      message: roleConfig.successMessage,
      token: generateToken({
        id: user._id,
        role: user.role,
        name: user.name,
        email: user.email,
      }),
      user: serializeUser(user),
    };
  } catch (error) {
    AppError.rethrow(error, roleConfig.internalErrorMessage);
  }
};

const logout = (message) => ({ message });

const getCurrentRoleUser = async (authUser, role) => {
  const roleConfig = ROLE_CONFIG[role];

  try {
    const user = await userRepository.findById(authUser.id, {
      select: "_id name email role",
    });

    if (!user) {
      throw new AppError("Session expired. Please log in again.", 401);
    }

    if (!hasRole(user, role)) {
      throw new AppError(roleConfig.forbiddenMessage, 403);
    }

    return {
      message: "Session active",
      user: serializeUser(user),
    };
  } catch (error) {
    AppError.rethrow(error, roleConfig.internalErrorMessage);
  }
};

module.exports = {
  loginAdmin: (payload, requestContext) => loginRoleUser(payload, "admin", requestContext),
  loginEngineer: (payload, requestContext) => loginRoleUser(payload, "engineer", requestContext),
  loginSupervisor: (payload, requestContext) => loginRoleUser(payload, "supervisor", requestContext),
  logout,
  getCurrentAdminUser: (authUser) => getCurrentRoleUser(authUser, "admin"),
  getCurrentEngineerUser: (authUser) => getCurrentRoleUser(authUser, "engineer"),
  getCurrentSupervisorUser: (authUser) => getCurrentRoleUser(authUser, "supervisor"),
};
