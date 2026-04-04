const { z } = require("zod");
const { isoDate, noInputSchema, objectId, optionalText, requiredText, strictObject } = require("./common");

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

const createDailyTaskSchema = {
  body: buildTaskBodySchema(isoDate("date")),
  params: noInputSchema,
  query: noInputSchema,
};

const createMonthlyTaskSchema = {
  body: buildTaskBodySchema(isoDate("date")),
  params: noInputSchema,
  query: noInputSchema,
};

const projectTasksParamsSchema = strictObject({
  projectId: objectId("projectId"),
});

const taskIdParamsSchema = strictObject({
  taskId: objectId("taskId"),
});

const getTasksByProjectSchema = {
  body: noInputSchema,
  params: projectTasksParamsSchema,
  query: noInputSchema,
};

const getDailyTasksByProjectSchema = {
  body: noInputSchema,
  params: projectTasksParamsSchema,
  query: strictObject({
    date: isoDate("date").optional(),
  }),
};

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
  createDailyTaskSchema,
  createMonthlyTaskSchema,
  getDailyTasksByProjectSchema,
  getTasksByProjectSchema,
  deleteTaskSchema,
  reviewTaskSchema,
  listTasksSchema,
};
