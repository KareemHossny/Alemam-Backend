const mongoose = require("mongoose");
const { validateProjectAssignments } = require("../src/utils/referenceIntegrity");

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  scopeOfWork: { type: String, required: true },
  engineers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  supervisors: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

projectSchema.pre("save", async function validateAssignmentsBeforeSave(next) {
  try {
    if (!this.isNew && !this.isModified("engineers") && !this.isModified("supervisors")) {
      return next();
    }

    const validatedAssignments = await validateProjectAssignments({
      engineers: this.engineers,
      supervisors: this.supervisors,
    }, {
      session: this.$session?.(),
    });

    this.engineers = validatedAssignments.engineers;
    this.supervisors = validatedAssignments.supervisors;

    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model("Project", projectSchema);
