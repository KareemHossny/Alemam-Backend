const bcrypt = require("bcryptjs");
const AppError = require("../../core/errors/AppError");
const { buildUserDeletionBlockers, getUserReferenceSummary } = require("../../utils/referenceIntegrity");
const runInTransaction = require("../../utils/runInTransaction");
const userRepository = require("./user.repository");

const serializeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
});

const createUser = async ({ name, email, password, role }) => {
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

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = userRepository.buildUser({
      name,
      email,
      password: hashedPassword,
      role,
    });

    await userRepository.save(user);

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
    return await userRepository.listActiveUsers();
  } catch (error) {
    AppError.rethrow(error, "Error fetching users");
  }
};

const deleteUser = async (id) => {
  try {
    await runInTransaction(async (session) => {
      const user = await userRepository.findById(id, { session });

      if (!user) {
        throw new AppError("User not found", 404, { code: "USER_NOT_FOUND" });
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

      await userRepository.save(user, { session });
    });

    return {
      message: "User archived successfully",
    };
  } catch (error) {
    AppError.rethrow(error, "Error deleting user");
  }
};

module.exports = {
  createUser,
  getAllUsers,
  deleteUser,
};
