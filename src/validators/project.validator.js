const { z } = require("zod");
const { noInputSchema, objectId, requiredText, strictObject } = require("./common");
const { adminTaskListQuerySchema } = require("./task.validator");
const { inspectProjectAssignments, normalizeIds } = require("../utils/referenceIntegrity");

const buildAssignmentArraySchema = (fieldName) =>
  z
    .array(objectId(fieldName))
    .default([])
    .superRefine((ids, ctx) => {
      const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);

      if (duplicateIds.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${fieldName} contains duplicate assignments: ${normalizeIds(duplicateIds).join(", ")}`,
        });
      }
    });

const addProjectAssignmentIssues = async (data, ctx) => {
  const result = await inspectProjectAssignments({
    engineers: data.engineers || [],
    supervisors: data.supervisors || [],
  });
  const engineerSet = new Set(result.engineers);
  const supervisorSet = new Set(result.supervisors);
  const missingEngineerIds = result.missingUserIds.filter((id) => engineerSet.has(id));
  const missingSupervisorIds = result.missingUserIds.filter((id) => supervisorSet.has(id));

  if (result.overlappingIds.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["engineers"],
      message: `Engineers and supervisors cannot overlap: ${result.overlappingIds.join(", ")}`,
    });
  }

  if (result.missingUserIds.length > 0) {
    if (missingEngineerIds.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["engineers"],
        message: `These engineers do not exist or are deleted: ${missingEngineerIds.join(", ")}`,
      });
    }

    if (missingSupervisorIds.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["supervisors"],
        message: `These supervisors do not exist or are deleted: ${missingSupervisorIds.join(", ")}`,
      });
    }
  }

  if (result.invalidEngineerIds.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["engineers"],
      message: `These users are not valid engineers: ${result.invalidEngineerIds.join(", ")}`,
    });
  }

  if (result.invalidSupervisorIds.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["supervisors"],
      message: `These users are not valid supervisors: ${result.invalidSupervisorIds.join(", ")}`,
    });
  }
};

const buildProjectBodySchema = (options = {}) => {
  const { partial = false } = options;

  return strictObject({
    name: partial ? requiredText("name").optional() : requiredText("name"),
    scopeOfWork: partial ? requiredText("scopeOfWork", 2000).optional() : requiredText("scopeOfWork", 2000),
    engineers: partial ? buildAssignmentArraySchema("engineers").optional() : buildAssignmentArraySchema("engineers"),
    supervisors: partial ? buildAssignmentArraySchema("supervisors").optional() : buildAssignmentArraySchema("supervisors"),
  }).superRefine(async (data, ctx) => {
    const shouldValidateAssignments =
      !partial || data.engineers !== undefined || data.supervisors !== undefined;

    if (!shouldValidateAssignments) {
      return;
    }

    await addProjectAssignmentIssues(data, ctx);
  });
};

const createProjectSchema = {
  body: buildProjectBodySchema(),
  params: noInputSchema,
  query: noInputSchema,
};

const projectIdParamsSchema = strictObject({
  id: objectId("id"),
});

const projectByIdSchema = {
  body: noInputSchema,
  params: projectIdParamsSchema,
  query: noInputSchema,
};

const updateProjectSchema = {
  body: buildProjectBodySchema({ partial: true }).refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  }),
  params: projectIdParamsSchema,
  query: noInputSchema,
};

const deleteProjectSchema = {
  body: noInputSchema,
  params: strictObject({
    projectId: objectId("projectId"),
  }),
  query: noInputSchema,
};

const getProjectTasksSchema = {
  body: noInputSchema,
  params: strictObject({
    projectId: objectId("projectId"),
  }),
  query: adminTaskListQuerySchema,
};

const listProjectsSchema = {
  body: noInputSchema,
  params: noInputSchema,
  query: noInputSchema,
};

module.exports = {
  createProjectSchema,
  projectByIdSchema,
  updateProjectSchema,
  deleteProjectSchema,
  getProjectTasksSchema,
  listProjectsSchema,
};
