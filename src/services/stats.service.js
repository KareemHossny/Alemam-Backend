const Project = require("../../models/Project");
const User = require("../../models/User");
const DailyTask = require("../../models/dailyTask");
const MonthlyTask = require("../../models/monthlyTask");
const AppError = require("../utils/AppError");
const { buildAggregationTaskMatch } = require("../utils/taskQuery");

const PROJECT_COLLECTION_NAME = Project.collection.name;
const USER_COLLECTION_NAME = User.collection.name;
const MONTHLY_TASK_COLLECTION_NAME = MonthlyTask.collection.name;

const buildStatusAccumulator = (status) => ({
  $sum: {
    $cond: [{ $eq: ["$status", status] }, 1, 0],
  },
});

const buildTaskMetricsGroup = () => ({
  totalTasks: { $sum: 1 },
  pendingTasks: buildStatusAccumulator("pending"),
  completedTasks: buildStatusAccumulator("done"),
  failedTasks: buildStatusAccumulator("failed"),
  reviewedTasks: {
    $sum: {
      $cond: [{ $ne: ["$status", "pending"] }, 1, 0],
    },
  },
  dailyTasks: {
    $sum: {
      $cond: [{ $eq: ["$taskType", "daily"] }, 1, 0],
    },
  },
  monthlyTasks: {
    $sum: {
      $cond: [{ $eq: ["$taskType", "monthly"] }, 1, 0],
    },
  },
});

const buildTaskSourceProjection = (taskType) => ({
  project: 1,
  createdBy: 1,
  status: 1,
  date: 1,
  createdAt: 1,
  reviewedBy: 1,
  reviewedAt: 1,
  taskType: { $literal: taskType },
});

const buildUnifiedTaskSourcePipeline = ({ filters = {}, aggregateOptions = {} } = {}) => {
  const taskMatch = buildAggregationTaskMatch(filters, aggregateOptions);

  return [
    { $match: taskMatch },
    { $project: buildTaskSourceProjection("daily") },
    {
      $unionWith: {
        coll: MONTHLY_TASK_COLLECTION_NAME,
        pipeline: [
          { $match: taskMatch },
          { $project: buildTaskSourceProjection("monthly") },
        ],
      },
    },
  ];
};

const getDefaultTotals = () => ({
  totalTasks: 0,
  pendingTasks: 0,
  completedTasks: 0,
  failedTasks: 0,
  reviewedTasks: 0,
  dailyTasks: 0,
  monthlyTasks: 0,
  completionRate: 0,
  reviewRate: 0,
});

const formatTotals = (totals = {}) => {
  const normalizedTotals = {
    ...getDefaultTotals(),
    ...totals,
  };

  return {
    ...normalizedTotals,
    completionRate:
      normalizedTotals.totalTasks > 0
        ? Math.round((normalizedTotals.completedTasks / normalizedTotals.totalTasks) * 100)
        : 0,
    reviewRate:
      normalizedTotals.totalTasks > 0
        ? Math.round((normalizedTotals.reviewedTasks / normalizedTotals.totalTasks) * 100)
        : 0,
  };
};

const aggregateTaskTotals = async ({ filters = {}, aggregateOptions = {} } = {}) => {
  const pipeline = [
    ...buildUnifiedTaskSourcePipeline({ filters, aggregateOptions }),
    {
      $group: {
        _id: null,
        ...buildTaskMetricsGroup(),
      },
    },
  ];

  const [result] = await DailyTask.aggregate(pipeline);

  return formatTotals(result || {});
};

const buildByStatusFacet = () => [
  {
    $group: {
      _id: "$status",
      count: { $sum: 1 },
    },
  },
  {
    $project: {
      _id: 0,
      status: "$_id",
      count: 1,
    },
  },
  { $sort: { count: -1, status: 1 } },
];

const buildByTaskTypeFacet = () => [
  {
    $group: {
      _id: "$taskType",
      count: { $sum: 1 },
    },
  },
  {
    $project: {
      _id: 0,
      taskType: "$_id",
      count: 1,
    },
  },
  { $sort: { taskType: 1 } },
];

const buildByProjectFacet = () => [
  {
    $group: {
      _id: "$project",
      ...buildTaskMetricsGroup(),
    },
  },
  { $sort: { totalTasks: -1, _id: 1 } },
  {
    $lookup: {
      from: PROJECT_COLLECTION_NAME,
      let: { projectId: "$_id" },
      pipeline: [
        {
          $match: {
            $expr: { $eq: ["$_id", "$$projectId"] },
          },
        },
        {
          $project: {
            name: 1,
            scopeOfWork: 1,
          },
        },
      ],
      as: "project",
    },
  },
  {
    $unwind: {
      path: "$project",
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $project: {
      _id: 0,
      projectId: "$_id",
      name: "$project.name",
      scopeOfWork: "$project.scopeOfWork",
      totalTasks: 1,
      pendingTasks: 1,
      completedTasks: 1,
      failedTasks: 1,
      reviewedTasks: 1,
      dailyTasks: 1,
      monthlyTasks: 1,
    },
  },
];

const buildByUserFacet = () => [
  {
    $group: {
      _id: "$createdBy",
      ...buildTaskMetricsGroup(),
    },
  },
  { $sort: { totalTasks: -1, _id: 1 } },
  {
    $lookup: {
      from: USER_COLLECTION_NAME,
      let: { userId: "$_id" },
      pipeline: [
        {
          $match: {
            $expr: { $eq: ["$_id", "$$userId"] },
          },
        },
        {
          $project: {
            name: 1,
            email: 1,
            role: 1,
            isDeleted: 1,
          },
        },
      ],
      as: "user",
    },
  },
  {
    $unwind: {
      path: "$user",
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $project: {
      _id: 0,
      userId: "$_id",
      name: "$user.name",
      email: "$user.email",
      role: "$user.role",
      isDeleted: "$user.isDeleted",
      totalTasks: 1,
      pendingTasks: 1,
      completedTasks: 1,
      failedTasks: 1,
      reviewedTasks: 1,
      dailyTasks: 1,
      monthlyTasks: 1,
    },
  },
];

const aggregateTaskBreakdowns = async ({
  filters = {},
  aggregateOptions = {},
  includeByProject = true,
  includeByUser = true,
} = {}) => {
  const facets = {
    totals: [
      {
        $group: {
          _id: null,
          ...buildTaskMetricsGroup(),
        },
      },
      {
        $project: {
          _id: 0,
          totalTasks: 1,
          pendingTasks: 1,
          completedTasks: 1,
          failedTasks: 1,
          reviewedTasks: 1,
          dailyTasks: 1,
          monthlyTasks: 1,
        },
      },
    ],
    byStatus: buildByStatusFacet(),
    byTaskType: buildByTaskTypeFacet(),
  };

  if (includeByProject) {
    facets.byProject = buildByProjectFacet();
  }

  if (includeByUser) {
    facets.byUser = buildByUserFacet();
  }

  const pipeline = [
    ...buildUnifiedTaskSourcePipeline({ filters, aggregateOptions }),
    { $facet: facets },
  ];

  const [result = {}] = await DailyTask.aggregate(pipeline);

  return {
    totals: formatTotals(result.totals?.[0]),
    byStatus: result.byStatus || [],
    byTaskType: result.byTaskType || [],
    ...(includeByProject ? { byProject: result.byProject || [] } : {}),
    ...(includeByUser ? { byUser: result.byUser || [] } : {}),
  };
};

const aggregateProjectTaskStats = async ({ projectIds = [] } = {}) => {
  if (!projectIds.length) {
    return [];
  }

  const pipeline = [
    ...buildUnifiedTaskSourcePipeline({
      aggregateOptions: {
        projectIds,
      },
    }),
    ...buildByProjectFacet(),
  ];

  return DailyTask.aggregate(pipeline);
};

const getAdminTaskStats = async (filters = {}) => {
  try {
    const data = await aggregateTaskBreakdowns({ filters });

    return {
      message: "Task stats fetched successfully",
      data,
    };
  } catch (error) {
    AppError.rethrow(error, "Error fetching task stats");
  }
};

const getAdminProjectStats = async (projectId, filters = {}) => {
  try {
    const project = await Project.findById(projectId).select("name scopeOfWork").lean();

    if (!project) {
      throw new AppError("Project not found", 404);
    }

    const data = await aggregateTaskBreakdowns({
      filters: {
        ...filters,
        projectId,
      },
      includeByProject: false,
    });

    return {
      message: "Project task stats fetched successfully",
      data: {
        project,
        ...data,
      },
    };
  } catch (error) {
    AppError.rethrow(error, "Error fetching project stats");
  }
};

const getEngineerDashboardStats = async (user) => {
  try {
    const projects = await Project.find({ engineers: user.id }).select("_id").lean();
    const projectIds = projects.map((project) => project._id);
    const totals = await aggregateTaskTotals({
      aggregateOptions: {
        projectIds,
      },
    });

    return {
      message: "Engineer dashboard stats fetched successfully",
      data: {
        totalProjects: projects.length,
        ...totals,
      },
    };
  } catch (error) {
    AppError.rethrow(error, "Error fetching engineer dashboard stats");
  }
};

const getSupervisorDashboardStats = async (user) => {
  try {
    const projects = await Project.find({ supervisors: user.id }).select("_id engineers").lean();
    const projectIds = projects.map((project) => project._id);
    const totals = await aggregateTaskTotals({
      aggregateOptions: {
        projectIds,
      },
    });
    const engineerIds = new Set(
      projects.flatMap((project) => (project.engineers || []).map((engineerId) => String(engineerId)))
    );

    return {
      message: "Supervisor dashboard stats fetched successfully",
      data: {
        totalProjects: projects.length,
        totalEngineers: engineerIds.size,
        pendingReviews: totals.pendingTasks,
        reviewedTasks: totals.reviewedTasks,
        totalTasks: totals.totalTasks,
        failedTasks: totals.failedTasks,
        dailyTasks: totals.dailyTasks,
        monthlyTasks: totals.monthlyTasks,
        reviewRate: totals.reviewRate,
      },
    };
  } catch (error) {
    AppError.rethrow(error, "Error fetching supervisor dashboard stats");
  }
};

const getSupervisorProjectStats = async (user) => {
  try {
    const projects = await Project.find({ supervisors: user.id })
      .select("name scopeOfWork engineers")
      .populate("engineers", "name email")
      .lean();
    const statsByProject = await aggregateProjectTaskStats({
      projectIds: projects.map((project) => project._id),
    });
    const statsMap = new Map(
      statsByProject.map((stats) => [String(stats.projectId), stats])
    );

    return {
      message: "Supervisor project stats fetched successfully",
      data: projects.map((project) => {
        const stats = statsMap.get(String(project._id));

        return {
          ...project,
          stats: {
            pending: stats?.pendingTasks || 0,
            reviewed: stats?.reviewedTasks || 0,
            total: stats?.totalTasks || 0,
            completed: stats?.completedTasks || 0,
            failed: stats?.failedTasks || 0,
            daily: stats?.dailyTasks || 0,
            monthly: stats?.monthlyTasks || 0,
          },
        };
      }),
    };
  } catch (error) {
    AppError.rethrow(error, "Error fetching supervisor project stats");
  }
};

module.exports = {
  getAdminTaskStats,
  getAdminProjectStats,
  getEngineerDashboardStats,
  getSupervisorDashboardStats,
  getSupervisorProjectStats,
};
