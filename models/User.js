const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const config = require("../src/config");

const applyActiveUserFilter = function applyActiveUserFilter(next) {
  if (!this.getOptions?.().includeDeleted) {
    this.where({
      isDeleted: { $ne: true },
    });
  }

  next();
};

const USER_ROLES = Object.freeze(["admin", "engineer", "supervisor"]);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: USER_ROLES, required: true },
    assignedProjects: [{ type: mongoose.Schema.Types.ObjectId, ref: "Project" }],
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function hashPasswordBeforeSave(next) {
  try {
    if (!this.isModified("password")) {
      return next();
    }

    this.password = await bcrypt.hash(this.password, config.auth.bcryptSaltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.pre(/^find/, applyActiveUserFilter);
userSchema.pre("countDocuments", applyActiveUserFilter);

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
module.exports.USER_ROLES = USER_ROLES;
