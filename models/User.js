const mongoose = require("mongoose");

const applyActiveUserFilter = function applyActiveUserFilter(next) {
  if (!this.getOptions?.().includeDeleted) {
    this.where({
      isDeleted: { $ne: true },
    });
  }

  next();
};

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["engineer", "supervisor"], required: true },
  assignedProjects: [{ type: mongoose.Schema.Types.ObjectId, ref: "Project" }],
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
});

userSchema.pre(/^find/, applyActiveUserFilter);
userSchema.pre("countDocuments", applyActiveUserFilter);

module.exports = mongoose.model("User", userSchema);
