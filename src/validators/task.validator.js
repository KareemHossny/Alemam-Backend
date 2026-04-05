const { z } = require("zod");
const { isoDate, noInputSchema, objectId, optionalText, requiredText, strictObject } = require("./common");
const { inspectProjectAccess } = require("../utils/referenceIntegrity");
const { buildTaskFingerprint } = require("../utils/taskFingerprint");
const { getUserId } = require("../policies/role.policy");
const {
  getProjectAssignmentFieldForUser,
  getProjectAccessDeniedMessage,
} = require("../policies/project.policy");

const BULK_TASK_LIMIT = 50;
const DEFAULT_TASKS_PAGE = 1;
const DEFAULT_TASKS_LIMIT = 20;
const MAX_TASKS_LIMIT = 100;

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

const taskStatusSchema = z.enum(["pending", "done", "failed"], {
  errorMap: () => ({ message: "status must be pending, done, or failed" }),
});

const positiveIntegerWithDefault = (fieldName, defaultValue, maxValue) =>
  z.preprocess((value) => {
    if (value === undefined || value === null || value === "") {
      return defaultValue;
    }

    if (typeof value === "number") {
      return value;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }, z
    .number({
      invalid_type_error: `${fieldName} must be a number`,
    })
    .int(`${fieldName} must be an integer`)
    .min(1, `${fieldName} must be at least 1`)
    .max(maxValue, `${fieldName} must be at most ${maxValue}`));

const baseTaskListQuerySchema = strictObject({
  page: positiveIntegerWithDefault("page", DEFAULT_TASKS_PAGE, 100000),
  limit: positiveIntegerWithDefault("limit", DEFAULT_TASKS_LIMIT, MAX_TASKS_LIMIT),
  status: taskStatusSchema.optional(),
  userId: objectId("userId").optional(),
  date: isoDate("date").optional(),
  dateFrom: isoDate("dateFrom").optional(),
  dateTo: isoDate("dateTo").optional(),
}).superRefine((query, ctx) => {
  if (query.date && (query.dateFrom || query.dateTo)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["date"],
      message: "Use either date or dateFrom/dateTo, not both",
    });
  }

  if (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["dateTo"],
      message: "dateTo must be on or after dateFrom",
    });
  }
});

const adminTaskListQuerySchema = baseTaskListQuerySchema.extend({
  projectId: objectId("projectId").optional(),
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

const addProjectAccessIssues = async (tasks, req, ctx) => {
  const { missingProjectIds, inaccessibleProjectIds } = await inspectProjectAccess({
    projectIds: tasks.map((task) => task.projectId),
    user: req.user,
    assignmentField: getProjectAssignmentFieldForUser(req.user),
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
        message: getProjectAccessDeniedMessage(req.user),
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

const getTasksByProjectSchema = buildTaskListSchema(baseTaskListQuerySchema);

const getDailyTasksByProjectSchema = buildTaskListSchema(
  baseTaskListQuerySchema
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
  query: adminTaskListQuerySchema,
};

module.exports = {
  BULK_TASK_LIMIT,
  DEFAULT_TASKS_LIMIT,
  DEFAULT_TASKS_PAGE,
  MAX_TASKS_LIMIT,
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
