const mongoose = require("mongoose");

const monthlyTaskSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    date: { type: Date, required: true },
    note: { type: String },
    fingerprint: { type: String, trim: true },
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

monthlyTaskSchema.index({ fingerprint: 1 }, { unique: true, sparse: true });
monthlyTaskSchema.index({ project: 1, status: 1, date: -1 });
monthlyTaskSchema.index({ createdBy: 1, status: 1, date: -1 });

module.exports = mongoose.model("MonthlyTask", monthlyTaskSchema);
