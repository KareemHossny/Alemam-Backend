const mongoose = require("mongoose");

const monthlyTaskSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    date: { type: Date, required: true },
    note: { type: String },
    status: {
      type: String,
      enum: ["pending", "done", "failed"],
      default: "pending",
    },
    supervisorNote: { type: String },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, 
    reviewedAt: { type: Date } 
  },
  { timestamps: true }
);

module.exports = mongoose.model("MonthlyTask", monthlyTaskSchema);