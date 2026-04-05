const { z } = require("zod");
const { isoDate, noInputSchema, objectId, strictObject } = require("./common");

const taskStatusSchema = z.enum(["pending", "done", "failed"], {
  errorMap: () => ({ message: "status must be pending, done, or failed" }),
});

const buildStatsFilterQuerySchema = ({ includeProjectId = false } = {}) =>
  strictObject({
    ...(includeProjectId ? { projectId: objectId("projectId").optional() } : {}),
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

const dashboardStatsSchema = {
  body: noInputSchema,
  params: noInputSchema,
  query: noInputSchema,
};

const supervisorProjectStatsSchema = {
  body: noInputSchema,
  params: noInputSchema,
  query: noInputSchema,
};

const adminTaskStatsSchema = {
  body: noInputSchema,
  params: noInputSchema,
  query: buildStatsFilterQuerySchema({ includeProjectId: true }),
};

const adminProjectStatsSchema = {
  body: noInputSchema,
  params: strictObject({
    projectId: objectId("projectId"),
  }),
  query: buildStatsFilterQuerySchema(),
};

module.exports = {
  dashboardStatsSchema,
  supervisorProjectStatsSchema,
  adminTaskStatsSchema,
  adminProjectStatsSchema,
};
