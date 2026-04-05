const Project = require("../../models/Project");
const DailyTask = require("../../models/dailyTask");
const MonthlyTask = require("../../models/monthlyTask");
const User = require("../../models/User");
const AppError = require("../utils/AppError");
const { canCreateTask, canDeleteTask, canReviewTask } = require("../policies/task.policy");
const runInTransaction = require("../utils/runInTransaction");
const { buildTaskFingerprint } = require("../utils/taskFingerprint");
const {
  normalizeUtcDateOnly,
  buildTaskQuery,
} = require("../utils/taskQuery");

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
    sort: { date: -1, createdAt: -1 },
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
    sort: { date: -1, createdAt: -1 },
  },
};

const getTaskConfig = (taskType) => TASK_CONFIG[taskType];

const getBulkCreateErrorMessage = (taskType) => `Error creating ${taskType} tasks`;

const normalizePagination = (filters = {}) => {
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 20;

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const buildPagination = ({ total, page, limit }) => ({
  total,
  page,
  pages: total === 0 ? 0 : Math.ceil(total / limit),
  limit,
});

const buildStatusSummary = (statusBuckets = []) => {
  const summary = {
    pending: 0,
    done: 0,
    failed: 0,
  };

  statusBuckets.forEach(({ _id, count }) => {
    if (_id && summary[_id] !== undefined) {
      summary[_id] = count;
    }
  });

  return summary;
};

const applyPopulate = (query, populate = []) => {
  let nextQuery = query;

  populate.forEach((populateConfig) => {
    nextQuery = nextQuery.populate(populateConfig.path, populateConfig.select);
  });

  return nextQuery;
};

const getPaginatedTasks = async ({ taskType, filters = {}, populate = [] }) => {
  const config = getTaskConfig(taskType);
  const { page, limit, skip } = normalizePagination(filters);
  const query = buildTaskQuery(filters);

  const [total, statusBuckets, tasks] = await Promise.all([
    config.model.countDocuments(query),
    config.model.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),
    applyPopulate(
      config.model
        .find(query)
        .sort(config.sort)
        .skip(skip)
        .limit(limit),
      populate
    ),
  ]);

  return {
    data: tasks,
    pagination: buildPagination({ total, page, limit }),
    summary: {
      statusCounts: buildStatusSummary(statusBuckets),
    },
  };
};

const getProjectOrThrow = async (projectId, { message, statusCode }, options = {}) => {
  const { session } = options;
  const project = await Project.findById(projectId).session(session || null);

  if (!project) {
    throw new AppError(message, statusCode);
  }

  return project;
};

const normalizeTaskDate = (taskType, date) =>
  taskType === "daily"
    ? normalizeUtcDateOnly(date)
    : date
      ? new Date(date)
      : undefined;

const prepareTaskDocument = (taskType, payload, userId) => {
  const normalizedDate = normalizeTaskDate(taskType, payload.date);
  const document = {
    project: payload.projectId,
    createdBy: userId,
    title: payload.title,
    ...(payload.note ? { note: payload.note } : {}),
    ...(normalizedDate ? { date: normalizedDate } : {}),
  };

  const fingerprint = buildTaskFingerprint({
    project: document.project,
    createdBy: document.createdBy,
    title: document.title,
    note: document.note,
    date: document.date,
  });

  return {
    document: {
      ...document,
      fingerprint,
    },
    fingerprint,
  };
};

const buildDuplicateLookupCondition = (document) => {
  const baseCondition = {
    createdBy: document.createdBy,
    project: document.project,
    title: document.title,
    date: document.date,
  };

  if (document.note) {
    return {
      ...baseCondition,
      note: document.note,
    };
  }

  return {
    ...baseCondition,
    $or: [
      { note: { $exists: false } },
      { note: null },
      { note: "" },
    ],
  };
};

const buildBulkFailureItem = (task, index, code, reason, statusCode) => ({
  index,
  projectId: task.projectId,
  title: task.title,
  ...(task.date ? { date: task.date } : {}),
  code,
  reason,
  statusCode,
});

const resolveBulkFailureStatusCode = (failedItems) => {
  if (failedItems.some((item) => item.statusCode === 403)) {
    return 403;
  }

  if (failedItems.some((item) => item.statusCode === 404)) {
    return 404;
  }

  if (failedItems.some((item) => item.statusCode === 409)) {
    return 409;
  }

  return 400;
};

const buildBulkFailureResponse = (taskType, failedItems, requestedCount) => {
  const publicFailedItems = [...failedItems]
    .sort((left, right) => left.index - right.index)
    .map(({ statusCode, ...failedItem }) => failedItem);

  return {
    statusCode: resolveBulkFailureStatusCode(failedItems),
    message: `Bulk ${taskType} task creation failed. No tasks were saved.`,
    requestedCount,
    createdCount: 0,
    successItems: [],
    failedItems: publicFailedItems,
    rolledBack: true,
  };
};

const buildBulkSuccessResponse = (taskType, preparedTasks, createdTasks) => ({
  statusCode: 201,
  message: `${createdTasks.length} ${taskType} task(s) created successfully.`,
  requestedCount: preparedTasks.length,
  createdCount: createdTasks.length,
  successItems: createdTasks.map((task, index) => ({
    index: preparedTasks[index].index,
    taskId: task._id,
    projectId: String(task.project),
    title: task.title,
    date: task.date instanceof Date ? task.date.toISOString().split("T")[0] : undefined,
    status: task.status,
  })),
  failedItems: [],
  rolledBack: false,
});

const getExistingTaskFingerprints = async (taskType, preparedTasks, session) => {
  const config = getTaskConfig(taskType);
  const duplicateLookup = [
    {
      fingerprint: {
        $in: preparedTasks.map((task) => task.fingerprint),
      },
    },
    ...preparedTasks.map(({ document }) => buildDuplicateLookupCondition(document)),
  ];

  const existingTasks = await config.model
    .find({ $or: duplicateLookup })
    .select("project createdBy title note date fingerprint")
    .session(session);

  return new Set(
    existingTasks.map((task) =>
      task.fingerprint
      || buildTaskFingerprint({
        project: task.project,
        createdBy: task.createdBy,
        title: task.title,
        note: task.note,
        date: task.date,
      })
    )
  );
};

const ensureActiveEngineer = async (userId, session) => {
  const activeUser = await User.findById(userId).select("_id role").session(session);

  if (!activeUser) {
    throw new AppError("User session is no longer valid", 401);
  }

  return activeUser;
};

const getProjectAccessMap = async (projectIds, session) => {
  const projects = await Project.find({ _id: { $in: projectIds } })
    .select("_id engineers supervisors")
    .session(session);

  return new Map(projects.map((project) => [String(project._id), project]));
};

const createTask = async (taskType, payload, user) => {
  const config = getTaskConfig(taskType);

  try {
    const task = await runInTransaction(async (session) => {
      const [project, activeUser] = await Promise.all([
        getProjectOrThrow(payload.projectId, {
          message: "Project not found",
          statusCode: 404,
        }, { session }),
        ensureActiveEngineer(user.id, session),
      ]);

      if (!canCreateTask({ id: activeUser._id, role: activeUser.role }, project)) {
        throw new AppError("You are not assigned to this project", 403);
      }

      const preparedTask = prepareTaskDocument(taskType, payload, activeUser._id);
      const existingFingerprints = await getExistingTaskFingerprints(taskType, [
        {
          index: 0,
          originalTask: payload,
          ...preparedTask,
        },
      ], session);

      if (existingFingerprints.has(preparedTask.fingerprint)) {
        throw new AppError("A matching task already exists for this project, date, title, and note.", 409);
      }

      const createdTask = new config.model(preparedTask.document);

      await createdTask.save({ session });

      return createdTask;
    });

    console.log(`Engineer created ${taskType} task: ${task._id}`);

    return task;
  } catch (error) {
    AppError.rethrow(error, config.createError);
  }
};

const createTasksBulk = async (taskType, tasks, user) => {
  const config = getTaskConfig(taskType);

  try {
    const result = await runInTransaction(async (session) => {
      const activeUser = await ensureActiveEngineer(user.id, session);
      const projectAccessMap = await getProjectAccessMap(
        [...new Set(tasks.map((task) => task.projectId))],
        session
      );

      const failedItems = [];
      const preparedTasks = [];
      const requestFingerprints = new Map();

      tasks.forEach((task, index) => {
        const project = projectAccessMap.get(task.projectId);

        if (!project) {
          failedItems.push(
            buildBulkFailureItem(task, index, "PROJECT_NOT_FOUND", "Project not found", 404)
          );
          return;
        }

        if (!canCreateTask({ id: activeUser._id, role: activeUser.role }, project)) {
          failedItems.push(
            buildBulkFailureItem(task, index, "PROJECT_ACCESS_DENIED", "You are not assigned to this project", 403)
          );
          return;
        }

        const preparedTask = prepareTaskDocument(taskType, task, activeUser._id);
        const duplicateIndex = requestFingerprints.get(preparedTask.fingerprint);

        if (duplicateIndex !== undefined) {
          failedItems.push(
            buildBulkFailureItem(
              task,
              index,
              "DUPLICATE_IN_BATCH",
              `Duplicate task in this batch. Matches item ${duplicateIndex + 1}.`,
              409
            )
          );
          return;
        }

        requestFingerprints.set(preparedTask.fingerprint, index);
        preparedTasks.push({
          index,
          originalTask: task,
          ...preparedTask,
        });
      });

      if (preparedTasks.length > 0) {
        const existingFingerprints = await getExistingTaskFingerprints(taskType, preparedTasks, session);

        preparedTasks.forEach((task) => {
          if (existingFingerprints.has(task.fingerprint)) {
            failedItems.push(
              buildBulkFailureItem(
                task.originalTask,
                task.index,
                "DUPLICATE_TASK",
                "A matching task already exists for this project, date, title, and note.",
                409
              )
            );
          }
        });
      }

      if (failedItems.length > 0) {
        return buildBulkFailureResponse(taskType, failedItems, tasks.length);
      }

      const createdTasks = await config.model.insertMany(
        preparedTasks.map((task) => task.document),
        {
          session,
          ordered: true,
        }
      );

      return buildBulkSuccessResponse(taskType, preparedTasks, createdTasks);
    });

    if (!result.rolledBack) {
      console.log(`Engineer created ${result.createdCount} ${taskType} tasks in bulk`);
    }

    return result;
  } catch (error) {
    AppError.rethrow(error, getBulkCreateErrorMessage(taskType));
  }
};

const getProjectTasksForEngineer = async (taskType, projectId, user, filters = {}) => {
  try {
    const project = await getProjectOrThrow(projectId, {
      message: "Access denied to this project",
      statusCode: 403,
    });

    if (!canCreateTask(user, project)) {
      throw new AppError("Access denied to this project", 403);
    }

    return await getPaginatedTasks({
      taskType,
      filters: {
        ...filters,
        projectId,
      },
      populate: [
        { path: "createdBy", select: "name email" },
        { path: "reviewedBy", select: "name email" },
      ],
    });
  } catch (error) {
    AppError.rethrow(error, getTaskConfig(taskType).fetchError);
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
  try {
    const project = await getProjectOrThrow(projectId, {
      message: "Access denied to this project",
      statusCode: 403,
    });

    if (!canReviewTask(user, project)) {
      throw new AppError("Access denied to this project", 403);
    }

    return await getPaginatedTasks({
      taskType,
      filters: {
        ...filters,
        projectId,
      },
      populate: [
        { path: "createdBy", select: "name email" },
      ],
    });
  } catch (error) {
    AppError.rethrow(error, getTaskConfig(taskType).fetchError);
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

const getAllTasks = async (taskType, filters = {}) => {
  try {
    return await getPaginatedTasks({
      taskType,
      filters,
      populate: [
        { path: "project", select: "name scopeOfWork" },
        { path: "createdBy", select: "name email role" },
        { path: "reviewedBy", select: "name email" },
      ],
    });
  } catch (error) {
    AppError.rethrow(error, getTaskConfig(taskType).adminFetchError);
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
  createDailyTasksBulk: (tasks, user) => createTasksBulk("daily", tasks, user),
  createMonthlyTask: (payload, user) => createTask("monthly", payload, user),
  createMonthlyTasksBulk: (tasks, user) => createTasksBulk("monthly", tasks, user),
  getEngineerDailyTasks: (projectId, user, filters) => getProjectTasksForEngineer("daily", projectId, user, filters),
  getEngineerMonthlyTasks: (projectId, user, filters) => getProjectTasksForEngineer("monthly", projectId, user, filters),
  deleteDailyTask: (taskId, user) => deleteTask("daily", taskId, user),
  deleteMonthlyTask: (taskId, user) => deleteTask("monthly", taskId, user),
  getSupervisorDailyTasks: (projectId, user, filters) => getProjectTasksForSupervisor("daily", projectId, user, filters),
  getSupervisorMonthlyTasks: (projectId, user, filters) => getProjectTasksForSupervisor("monthly", projectId, user, filters),
  reviewDailyTask: (taskId, reviewData, user) => reviewTask("daily", taskId, reviewData, user),
  reviewMonthlyTask: (taskId, reviewData, user) => reviewTask("monthly", taskId, reviewData, user),
  getAllDailyTasks: (filters) => getAllTasks("daily", filters),
  getAllMonthlyTasks: (filters) => getAllTasks("monthly", filters),
  getAdminProjectTasks,
};
