const { noInputSchema, objectId, objectIdArray, requiredText, strictObject } = require("./common");

const createProjectSchema = {
  body: strictObject({
    name: requiredText("name"),
    scopeOfWork: requiredText("scopeOfWork", 2000),
    engineers: objectIdArray("engineers"),
    supervisors: objectIdArray("supervisors"),
  }),
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
  body: strictObject({
    name: requiredText("name").optional(),
    scopeOfWork: requiredText("scopeOfWork", 2000).optional(),
    engineers: objectIdArray("engineers").optional(),
    supervisors: objectIdArray("supervisors").optional(),
  }).refine((data) => Object.keys(data).length > 0, {
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
  query: noInputSchema,
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
