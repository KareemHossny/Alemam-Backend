const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  scopeOfWork: { type: String, required: true },
  engineers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  supervisors: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

module.exports = mongoose.model("Project", projectSchema);