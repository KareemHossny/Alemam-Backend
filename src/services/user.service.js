const bcrypt = require("bcryptjs");
const User = require("../../models/User");
const AppError = require("../utils/AppError");
const { buildUserDeletionBlockers, getUserReferenceSummary } = require("../utils/referenceIntegrity");
const runInTransaction = require("../utils/runInTransaction");

const createUser = async ({ name, email, password, role }) => {
  try {
    const existingUser = await User.findOne({ email }).setOptions({ includeDeleted: true });
    if (existingUser) {
      if (existingUser.isDeleted) {
        throw new AppError("A deleted user with this email already exists. Restore or rename the user before creating a new account.", 400);
      }

      throw new AppError("User already exists", 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
    });

    return {
      message: "User created successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  } catch (error) {
    AppError.rethrow(error, "Error creating user");
  }
};

const getAllUsers = async () => {
  try {
    return await User.find().select("-password -deletedAt -isDeleted");
  } catch (error) {
    AppError.rethrow(error, "Error fetching users");
  }
};

const deleteUser = async (id) => {
  try {
    await runInTransaction(async (session) => {
      const user = await User.findById(id).session(session);
      if (!user) {
        throw new AppError("User not found", 404);
      }

      const referenceSummary = await getUserReferenceSummary(id, { session });
      const blockers = buildUserDeletionBlockers(referenceSummary);

      if (blockers.length > 0) {
        throw new AppError(`Cannot delete user while references still exist. Reassign or clean these first: ${blockers.join(", ")}`, 409);
      }

      user.isDeleted = true;
      user.deletedAt = new Date();
      user.assignedProjects = [];

      await user.save({ session });
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
