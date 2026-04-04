const Project = require("../../models/Project");
const DailyTask = require("../../models/dailyTask");
const MonthlyTask = require("../../models/monthlyTask");
const AppError = require("../utils/AppError");
const { canCreateTask, canDeleteTask, canReviewTask } = require("../policies/task.policy");

const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

const TASK_CONFIG = {
  daily: {
    model: DailyTask,
    createError: "Error creating daily task",
    fetchError: "Error fetching daily tasks",
    deleteError: "Error deleting daily task",
    reviewError: "Error reviewing daily task",
    adminFetchError: "Error fetching daily tasks",
    notFoundMessage: "Daily task not found",
    deleteSuccessMessage: "Daily task deleted successfully",
    reviewSuccessMessage: "Daily task reviewed successfully",
    sort: { createdAt: -1 },
  },
  monthly: {
    model: MonthlyTask,
    createError: "Error creating monthly task",
    fetchError: "Error fetching monthly tasks",
    deleteError: "Error deleting monthly task",
    reviewError: "Error reviewing monthly task",
    adminFetchError: "Error fetching monthly tasks",
    notFoundMessage: "Monthly task not found",
    deleteSuccessMessage: "Monthly task deleted successfully",
    reviewSuccessMessage: "Monthly task reviewed successfully",
    sort: { date: -1 },
  },
};

const getTaskConfig = (taskType) => TASK_CONFIG[taskType];

const normalizeUtcDateOnly = (dateString) => {
  const match = DATE_ONLY_REGEX.exec(dateString || "");

  if (!match) {
    throw new AppError("Invalid date", 400);
  }

  const [, year, month, day] = match;

  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
};

const buildDailyTaskDateFilter = (dateString) => {
  const start = normalizeUtcDateOnly(dateString);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return {
    $gte: start,
    $lt: end,
  };
};

const buildTaskQuery = (taskType, projectId, filters = {}) => {
  const query = { project: projectId };

  if (taskType === "daily" && filters?.date) {
    query.date = buildDailyTaskDateFilter(filters.date);
  }

  return query;
};

const getProjectOrThrow = async (projectId, { message, statusCode }) => {
  const project = await Project.findById(projectId);

  if (!project) {
    throw new AppError(message, statusCode);
  }

  return project;
};

const createTask = async (taskType, payload, user) => {
  const config = getTaskConfig(taskType);

  try {
    const { projectId, title, note, date } = payload;
    const project = await getProjectOrThrow(projectId, {
      message: "Project not found",
      statusCode: 404,
    });

    if (!canCreateTask(user, project)) {
      throw new AppError("You are not assigned to this project", 403);
    }

    const normalizedDate =
      taskType === "daily"
        ? normalizeUtcDateOnly(date)
        : date
          ? new Date(date)
          : undefined;

    const task = await config.model.create({
      project: projectId,
      createdBy: user.id,
      title,
      note,
      ...(normalizedDate ? { date: normalizedDate } : {}),
    });

    console.log(`Engineer created ${taskType} task: ${task._id}`);

    return task;
  } catch (error) {
    AppError.rethrow(error, config.createError);
  }
};

const getProjectTasksForEngineer = async (taskType, projectId, user, filters = {}) => {
  const config = getTaskConfig(taskType);

  try {
    const project = await getProjectOrThrow(projectId, {
      message: "Access denied to this project",
      statusCode: 403,
    });

    if (!canCreateTask(user, project)) {
      throw new AppError("Access denied to this project", 403);
    }

    return await config.model
      .find(buildTaskQuery(taskType, projectId, filters))
      .populate("createdBy", "name email")
      .populate("reviewedBy", "name email")
      .sort(config.sort);
  } catch (error) {
    AppError.rethrow(error, config.fetchError);
  }
};

const deleteTask = async (taskType, taskId, user) => {
  const config = getTaskConfig(taskType);

  try {
    const task = await config.model.findById(taskId);
    if (!task) {
      throw new AppError(config.notFoundMessage, 404);
    }

    if (!canDeleteTask(user, task)) {
      throw new AppError("You can only delete your own tasks", 403);
    }

    await config.model.findByIdAndDelete(taskId);

    return {
      message: config.deleteSuccessMessage,
    };
  } catch (error) {
    AppError.rethrow(error, config.deleteError);
  }
};

const getProjectTasksForSupervisor = async (taskType, projectId, user, filters = {}) => {
  const config = getTaskConfig(taskType);

  try {
    const project = await getProjectOrThrow(projectId, {
      message: "Access denied to this project",
      statusCode: 403,
    });

    if (!canReviewTask(user, project)) {
      throw new AppError("Access denied to this project", 403);
    }

    return await config.model
      .find(buildTaskQuery(taskType, projectId, filters))
      .populate("createdBy", "name email")
      .sort(config.sort);
  } catch (error) {
    AppError.rethrow(error, config.fetchError);
  }
};

const reviewTask = async (taskType, taskId, reviewData, user) => {
  const config = getTaskConfig(taskType);

  try {
    const task = await config.model.findById(taskId);
    if (!task) {
      throw new AppError(config.notFoundMessage, 404);
    }

    const project = await getProjectOrThrow(task.project, {
      message: "Access denied to review this task",
      statusCode: 403,
    });

    if (!canReviewTask(user, project)) {
      throw new AppError("Access denied to review this task", 403);
    }

    task.status = reviewData.status;
    task.supervisorNote = reviewData.supervisorNote;
    task.reviewedBy = user.id;
    task.reviewedAt = new Date();

    await task.save();

    console.log(`Supervisor ${user.id} reviewed ${taskType} task: ${taskId}`);

    return {
      message: config.reviewSuccessMessage,
      task: await config.model
        .findById(taskId)
        .populate("createdBy", "name email role")
        .populate("reviewedBy", "name email"),
    };
  } catch (error) {
    AppError.rethrow(error, config.reviewError);
  }
};

const getAllTasks = async (taskType) => {
  const config = getTaskConfig(taskType);

  try {
    return await config.model
      .find()
      .populate("project", "name scopeOfWork")
      .populate("createdBy", "name email role")
      .populate("reviewedBy", "name email")
      .sort(config.sort);
  } catch (error) {
    AppError.rethrow(error, config.adminFetchError);
  }
};

const getAdminProjectTasks = async (projectId) => {
  try {
    const [dailyTasks, monthlyTasks, project] = await Promise.all([
      DailyTask.find({ project: projectId })
        .populate("createdBy", "name email role")
        .populate("reviewedBy", "name email")
        .sort({ createdAt: -1 }),
      MonthlyTask.find({ project: projectId })
        .populate("createdBy", "name email role")
        .populate("reviewedBy", "name email")
        .sort({ date: -1 }),
      Project.findById(projectId).select("name scopeOfWork"),
    ]);

    return {
      dailyTasks,
      monthlyTasks,
      project,
    };
  } catch (error) {
    AppError.rethrow(error, "Error fetching project tasks");
  }
};

module.exports = {
  createDailyTask: (payload, user) => createTask("daily", payload, user),
  createMonthlyTask: (payload, user) => createTask("monthly", payload, user),
  getEngineerDailyTasks: (projectId, user, filters) => getProjectTasksForEngineer("daily", projectId, user, filters),
  getEngineerMonthlyTasks: (projectId, user) => getProjectTasksForEngineer("monthly", projectId, user),
  deleteDailyTask: (taskId, user) => deleteTask("daily", taskId, user),
  deleteMonthlyTask: (taskId, user) => deleteTask("monthly", taskId, user),
  getSupervisorDailyTasks: (projectId, user, filters) => getProjectTasksForSupervisor("daily", projectId, user, filters),
  getSupervisorMonthlyTasks: (projectId, user) => getProjectTasksForSupervisor("monthly", projectId, user),
  reviewDailyTask: (taskId, reviewData, user) => reviewTask("daily", taskId, reviewData, user),
  reviewMonthlyTask: (taskId, reviewData, user) => reviewTask("monthly", taskId, reviewData, user),
  getAllDailyTasks: () => getAllTasks("daily"),
  getAllMonthlyTasks: () => getAllTasks("monthly"),
  getAdminProjectTasks,
};
