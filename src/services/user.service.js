const bcrypt = require("bcryptjs");
const User = require("../../models/User");
const AppError = require("../utils/AppError");

const createUser = async ({ name, email, password, role }) => {
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
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
    return await User.find().select("-password");
  } catch (error) {
    AppError.rethrow(error, "Error fetching users");
  }
};

const deleteUser = async (id) => {
  try {
    const user = await User.findById(id);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    await User.findByIdAndDelete(id);

    return {
      message: "User deleted successfully",
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
