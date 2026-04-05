const { z } = require("zod");
const { isoDate, noInputSchema, objectId, optionalText, requiredText, strictObject } = require("./common");
const { inspectProjectAccess } = require("../utils/referenceIntegrity");
const { buildTaskFingerprint } = require("../utils/taskFingerprint");
const { getUserId } = require("../policies/role.policy");

const BULK_TASK_LIMIT = 50;

const reviewStatusSchema = z
  .enum(["pending", "done", "failed", "approved", "rejected"])
  .transform((status) => {
    if (status === "approved") {
      return "done";
    }

    if (status === "rejected") {
      return "failed";
    }

    return status;
  });

const buildTaskBodySchema = (dateSchema) =>
  strictObject({
    projectId: objectId("projectId"),
    title: requiredText("title"),
    note: optionalText("note"),
    description: optionalText("description"),
    ...(dateSchema ? { date: dateSchema } : {}),
  })
    .superRefine((data, ctx) => {
      if (data.note && data.description && data.note !== data.description) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["description"],
          message: "Use either note or description, not both with different values",
        });
      }
    })
    .transform(({ description, note, ...rest }) => ({
      ...rest,
      note: note || description,
    }));

const getAssignmentFieldForUser = (user) => (user?.role === "supervisor" ? "supervisors" : "engineers");

const getProjectAccessMessage = (user) =>
  user?.role === "supervisor"
    ? "You are not assigned as a supervisor on this project"
    : "You are not assigned to this project";

const addProjectAccessIssues = async (tasks, req, ctx) => {
  const { missingProjectIds, inaccessibleProjectIds } = await inspectProjectAccess({
    projectIds: tasks.map((task) => task.projectId),
    user: req.user,
    assignmentField: getAssignmentFieldForUser(req.user),
  });

  const missingProjectIdSet = new Set(missingProjectIds);
  const inaccessibleProjectIdSet = new Set(inaccessibleProjectIds);

  tasks.forEach((task, index) => {
    const issuePathPrefix = tasks.length === 1 ? [] : [index];

    if (missingProjectIdSet.has(task.projectId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...issuePathPrefix, "projectId"],
        message: "Project not found",
      });
      return;
    }

    if (inaccessibleProjectIdSet.has(task.projectId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...issuePathPrefix, "projectId"],
        message: getProjectAccessMessage(req.user),
      });
    }
  });
};

const addBulkTaskBusinessIssues = async (tasks, req, ctx) => {
  const userId = getUserId(req.user);
  const fingerprintIndexMap = new Map();

  tasks.forEach((task, index) => {
    const fingerprint = buildTaskFingerprint({
      projectId: task.projectId,
      createdBy: userId,
      title: task.title,
      note: task.note,
      date: task.date,
    });
    const duplicateIndex = fingerprintIndexMap.get(fingerprint);

    if (duplicateIndex !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index],
        message: `Duplicate task in this batch. Matches item ${duplicateIndex + 1}.`,
      });
      return;
    }

    fingerprintIndexMap.set(fingerprint, index);
  });

  await addProjectAccessIssues(tasks, req, ctx);
};

const buildCreateTaskSchema = (dateSchema) => (req) => ({
  body: buildTaskBodySchema(dateSchema).superRefine(async (task, ctx) => {
    await addProjectAccessIssues([task], req, ctx);
  }),
  params: noInputSchema,
  query: noInputSchema,
});

const createDailyTaskSchema = buildCreateTaskSchema(isoDate("date"));

const createMonthlyTaskSchema = buildCreateTaskSchema(isoDate("date"));

const buildBulkTaskSchema = (dateSchema) =>
  z
    .array(buildTaskBodySchema(dateSchema), {
      invalid_type_error: "tasks must be an array",
    })
    .min(1, "At least one task is required")
    .max(BULK_TASK_LIMIT, `A maximum of ${BULK_TASK_LIMIT} tasks can be submitted at once`);

const buildCreateBulkTaskSchema = (dateSchema) => (req) => ({
  body: buildBulkTaskSchema(dateSchema).superRefine(async (tasks, ctx) => {
    await addBulkTaskBusinessIssues(tasks, req, ctx);
  }),
  params: noInputSchema,
  query: noInputSchema,
});

const createDailyTasksBulkSchema = buildCreateBulkTaskSchema(isoDate("date"));

const createMonthlyTasksBulkSchema = buildCreateBulkTaskSchema(isoDate("date"));

const projectTasksParamsSchema = strictObject({
  projectId: objectId("projectId"),
});

const taskIdParamsSchema = strictObject({
  taskId: objectId("taskId"),
});

const buildTaskListSchema = (querySchema) => (req) => ({
  body: noInputSchema,
  params: projectTasksParamsSchema.superRefine(async (params, ctx) => {
    await addProjectAccessIssues([{ projectId: params.projectId }], req, ctx);
  }),
  query: querySchema,
});

const getTasksByProjectSchema = buildTaskListSchema(noInputSchema);

const getDailyTasksByProjectSchema = buildTaskListSchema(
  strictObject({
    date: isoDate("date").optional(),
  })
);

const deleteTaskSchema = {
  body: noInputSchema,
  params: taskIdParamsSchema,
  query: noInputSchema,
};

const reviewTaskSchema = {
  body: strictObject({
    status: reviewStatusSchema,
    supervisorNote: optionalText("supervisorNote"),
  }),
  params: taskIdParamsSchema,
  query: noInputSchema,
};

const listTasksSchema = {
  body: noInputSchema,
  params: noInputSchema,
  query: noInputSchema,
};

module.exports = {
  BULK_TASK_LIMIT,
  createDailyTaskSchema,
  createDailyTasksBulkSchema,
  createMonthlyTaskSchema,
  createMonthlyTasksBulkSchema,
  getDailyTasksByProjectSchema,
  getTasksByProjectSchema,
  deleteTaskSchema,
  reviewTaskSchema,
  listTasksSchema,
};
