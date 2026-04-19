const AppError = require("../../core/errors/AppError");
const logger = require("../../utils/logger");
const { buildUserDeletionBlockers, getUserReferenceSummary } = require("../../utils/referenceIntegrity");
const runInTransaction = require("../../utils/runInTransaction");
const userRepository = require("./user.repository");

const serializeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
});

const ensureAdminBootstrapAvailable = async () => {
  const adminCount = await userRepository.countActiveUsersByRole("admin");

  if (adminCount > 0) {
    throw new AppError("Admin bootstrap is no longer available", 409, {
      code: "ADMIN_BOOTSTRAP_DISABLED",
    });
  }
};

const createUser = async ({ name, email, password, role }, actor) => {
  try {
    const existingUser = await userRepository.findByEmail(email, { includeDeleted: true });

    if (existingUser) {
      if (existingUser.isDeleted) {
        throw new AppError(
          "A deleted user with this email already exists. Restore or rename the user before creating a new account.",
          400,
          { code: "USER_EMAIL_ARCHIVED" }
        );
      }

      throw new AppError("User already exists", 400, { code: "USER_ALREADY_EXISTS" });
    }

    const user = userRepository.buildUser({
      name,
      email,
      password,
      role,
    });

    await userRepository.save(user);
    logger.logDataMutation({
      action: "create",
      entity: "user",
      entityId: user._id,
      actor,
      details: {
        targetRole: user.role,
        targetEmail: user.email,
      },
    });

    return {
      message: "User created successfully",
      user: serializeUser(user),
    };
  } catch (error) {
    AppError.rethrow(error, "Error creating user");
  }
};

const getAllUsers = async () => {
  try {
    const users = await userRepository.listActiveUsers();
    return Array.isArray(users) ? users : [];
  } catch (error) {
    AppError.rethrow(error, "Error fetching users");
  }
};

const bootstrapAdmin = async ({ name, email, password }) => {
  try {
    await ensureAdminBootstrapAvailable();
    return createUser({ name, email, password, role: "admin" }, null);
  } catch (error) {
    AppError.rethrow(error, "Error creating initial admin");
  }
};

const deleteUser = async (id, actor) => {
  try {
    let archivedUserId;
    let archivedUserEmail;

    await runInTransaction(async (session) => {
      const user = await userRepository.findById(id, { session });

      if (!user) {
        throw new AppError("User not found", 404, { code: "USER_NOT_FOUND" });
      }

      if (user.role === "admin" && String(actor?.id || actor?._id || "") === String(user._id)) {
        throw new AppError("You cannot delete your own admin account", 409, {
          code: "ADMIN_SELF_DELETE_BLOCKED",
        });
      }

      if (user.role === "admin") {
        const activeAdminCount = await userRepository.countActiveUsersByRole("admin", { session });

        if (activeAdminCount <= 1) {
          throw new AppError("Cannot delete the last active admin account", 409, {
            code: "LAST_ADMIN_DELETE_BLOCKED",
          });
        }
      }

      const referenceSummary = await getUserReferenceSummary(id, { session });
      const blockers = buildUserDeletionBlockers(referenceSummary);

      if (blockers.length > 0) {
        throw new AppError(
          `Cannot delete user while references still exist. Reassign or clean these first: ${blockers.join(", ")}`,
          409,
          {
            code: "USER_DELETE_BLOCKED",
            details: {
              blockers,
              referenceSummary,
            },
          }
        );
      }

      user.isDeleted = true;
      user.deletedAt = new Date();
      user.assignedProjects = [];
      archivedUserId = user._id;
      archivedUserEmail = user.email;

      await userRepository.save(user, { session });
    });

    logger.logDataMutation({
      action: "archive",
      entity: "user",
      entityId: archivedUserId,
      actor,
      details: {
        targetEmail: archivedUserEmail,
      },
    });

    return {
      message: "User archived successfully",
    };
  } catch (error) {
    AppError.rethrow(error, "Error deleting user");
  }
};

module.exports = {
  bootstrapAdmin,
  createUser,
  getAllUsers,
  deleteUser,
};
