const Project = require("../../models/Project");
const DailyTask = require("../../models/dailyTask");
const MonthlyTask = require("../../models/monthlyTask");
const User = require("../../models/User");
const AppError = require("../utils/AppError");

const populateProjectQuery = (query) => query.populate("engineers", "name email").populate("supervisors", "name email");

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
    }).select("name scopeOfWork engineers supervisors");

    if (populateUsers) {
      query = query.populate("engineers", "name email").populate("supervisors", "name email");
    }

    return await query;
  } catch (error) {
    AppError.rethrow(error, errorMessage);
  }
};

const createProject = async ({ name, scopeOfWork, engineers, supervisors }) => {
  try {
    const project = await Project.create({
      name,
      scopeOfWork,
      engineers: engineers || [],
      supervisors: supervisors || [],
    });

    const populatedProject = await getPopulatedProjectById(project._id);

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
    const project = await Project.findById(projectId);
    if (!project) {
      throw new AppError("Project not found", 404);
    }

    const { name, scopeOfWork, engineers, supervisors } = updates;

    if (name) project.name = name;
    if (scopeOfWork) project.scopeOfWork = scopeOfWork;
    if (engineers !== undefined) project.engineers = engineers;
    if (supervisors !== undefined) project.supervisors = supervisors;

    await project.save();

    const populatedProject = await getPopulatedProjectById(projectId);

    return buildProjectResponse("Project updated successfully", populatedProject);
  } catch (error) {
    AppError.rethrow(error, "Error updating project");
  }
};

const deleteProject = async (projectId) => {
  try {
    console.log("Deleting project with ID:", projectId);

    const project = await Project.findById(projectId);
    if (!project) {
      throw new AppError("Project not found", 404);
    }

    const dailyTasksResult = await DailyTask.deleteMany({ project: projectId });
    console.log(`Deleted ${dailyTasksResult.deletedCount} daily tasks`);

    const monthlyTasksResult = await MonthlyTask.deleteMany({ project: projectId });
    console.log(`Deleted ${monthlyTasksResult.deletedCount} monthly tasks`);

    await User.updateMany(
      {
        $or: [
          { _id: { $in: project.engineers } },
          { _id: { $in: project.supervisors } },
        ],
      },
      {
        $pull: {
          assignedProjects: projectId,
        },
      }
    );

    await Project.findByIdAndDelete(projectId);

    console.log(`Project "${project.name}" deleted successfully`);

    return {
      message: "Project and all related tasks deleted successfully",
      deletedDailyTasks: dailyTasksResult.deletedCount,
      deletedMonthlyTasks: monthlyTasksResult.deletedCount,
      projectName: project.name,
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
