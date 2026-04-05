const Project = require("../../models/Project");
const DailyTask = require("../../models/dailyTask");
const MonthlyTask = require("../../models/monthlyTask");
const AppError = require("../utils/AppError");
const { normalizeIds, syncProjectAssignments } = require("../utils/referenceIntegrity");
const runInTransaction = require("../utils/runInTransaction");

const PROJECT_SELECT = "name scopeOfWork engineers supervisors";
const PROJECT_USER_SELECT = "name email";

const populateProjectQuery = (query) =>
  query
    .select(PROJECT_SELECT)
    .populate("engineers", PROJECT_USER_SELECT)
    .populate("supervisors", PROJECT_USER_SELECT)
    .lean();

const getPopulatedProjectById = (projectId) => populateProjectQuery(Project.findById(projectId));

const buildProjectResponse = (message, project) => ({
  message,
  data: project,
  project,
});

const getAssignedProjects = async ({ userId, assignmentField, populateUsers, errorMessage }) => {
  try {
    let query = Project.find({
      [assignmentField]: userId,
    }).select(PROJECT_SELECT);

    if (populateUsers) {
      query = query.populate("engineers", "name email").populate("supervisors", "name email");
    }

    return await query.lean();
  } catch (error) {
    AppError.rethrow(error, errorMessage);
  }
};

const createProject = async ({ name, scopeOfWork, engineers, supervisors }) => {
  try {
    const engineerIds = normalizeIds(engineers || []);
    const supervisorIds = normalizeIds(supervisors || []);

    const populatedProject = await runInTransaction(async (session) => {
      const project = new Project({
        name,
        scopeOfWork,
        engineers: engineerIds,
        supervisors: supervisorIds,
      });

      await project.save({ session });

      await syncProjectAssignments({
        projectId: project._id,
        nextEngineerIds: engineerIds,
        nextSupervisorIds: supervisorIds,
        session,
      });

      return await populateProjectQuery(Project.findById(project._id).session(session));
    });

    return buildProjectResponse("Project created successfully", populatedProject);
  } catch (error) {
    AppError.rethrow(error, "Error creating project");
  }
};

const getAllProjects = async () => {
  try {
    return await populateProjectQuery(Project.find());
  } catch (error) {
    AppError.rethrow(error, "Error fetching projects");
  }
};

const getProjectById = async (projectId) => {
  try {
    const project = await getPopulatedProjectById(projectId);

    if (!project) {
      throw new AppError("Project not found", 404);
    }

    return buildProjectResponse("Project fetched successfully", project);
  } catch (error) {
    AppError.rethrow(error, "Error fetching project");
  }
};

const updateProject = async (projectId, updates) => {
  try {
    const populatedProject = await runInTransaction(async (session) => {
      const project = await Project.findById(projectId).session(session);
      if (!project) {
        throw new AppError("Project not found", 404);
      }

      const previousEngineerIds = normalizeIds(project.engineers || []);
      const previousSupervisorIds = normalizeIds(project.supervisors || []);
      const { name, scopeOfWork, engineers, supervisors } = updates;

      if (name) project.name = name;
      if (scopeOfWork) project.scopeOfWork = scopeOfWork;
      if (engineers !== undefined) project.engineers = normalizeIds(engineers);
      if (supervisors !== undefined) project.supervisors = normalizeIds(supervisors);

      await project.save({ session });

      await syncProjectAssignments({
        projectId,
        previousEngineerIds,
        previousSupervisorIds,
        nextEngineerIds: normalizeIds(project.engineers || []),
        nextSupervisorIds: normalizeIds(project.supervisors || []),
        session,
      });

      return await populateProjectQuery(Project.findById(projectId).session(session));
    });

    return buildProjectResponse("Project updated successfully", populatedProject);
  } catch (error) {
    AppError.rethrow(error, "Error updating project");
  }
};

const deleteProject = async (projectId) => {
  try {
    console.log("Deleting project with ID:", projectId);

    const deletionSummary = await runInTransaction(async (session) => {
      const project = await Project.findById(projectId).session(session);
      if (!project) {
        throw new AppError("Project not found", 404);
      }

      const dailyTasksResult = await DailyTask.deleteMany({ project: projectId }, { session });
      const monthlyTasksResult = await MonthlyTask.deleteMany({ project: projectId }, { session });

      await syncProjectAssignments({
        projectId,
        previousEngineerIds: normalizeIds(project.engineers || []),
        previousSupervisorIds: normalizeIds(project.supervisors || []),
        nextEngineerIds: [],
        nextSupervisorIds: [],
        session,
      });

      await Project.findByIdAndDelete(projectId, { session });

      return {
        projectName: project.name,
        deletedDailyTasks: dailyTasksResult.deletedCount,
        deletedMonthlyTasks: monthlyTasksResult.deletedCount,
      };
    });

    console.log(`Project "${deletionSummary.projectName}" deleted successfully`);

    return {
      message: "Project and all related tasks deleted successfully",
      deletedDailyTasks: deletionSummary.deletedDailyTasks,
      deletedMonthlyTasks: deletionSummary.deletedMonthlyTasks,
      projectName: deletionSummary.projectName,
    };
  } catch (error) {
    AppError.rethrow(error, "Error deleting project");
  }
};

module.exports = {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
  getEngineerProjects: (userId) =>
    getAssignedProjects({
      userId,
      assignmentField: "engineers",
      populateUsers: false,
      errorMessage: "Error fetching engineer projects",
    }),
  getSupervisorProjects: (userId) =>
    getAssignedProjects({
      userId,
      assignmentField: "supervisors",
      populateUsers: true,
      errorMessage: "Error fetching supervisor projects",
    }),
};
