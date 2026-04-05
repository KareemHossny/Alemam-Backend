const Project = require("../../../models/Project");
const DailyTask = require("../../../models/dailyTask");
const MonthlyTask = require("../../../models/monthlyTask");
const AppError = require("../../utils/AppError");
const { hasRole } = require("../../policies/role.policy");
const {
  getProjectAssignmentFieldForUser,
  getProjectAccessDeniedMessage,
  isEngineerAssignedToProject,
} = require("../../policies/project.policy");
const { canDeleteTask, canReviewTask } = require("../../policies/task.policy");
const { inspectProjectAccess, normalizeIds } = require("../../utils/referenceIntegrity");

const TASK_ACCESS_CONFIG = {
  daily: {
    model: DailyTask,
    notFoundMessage: "Daily task not found",
  },
  monthly: {
    model: MonthlyTask,
    notFoundMessage: "Monthly task not found",
  },
};

const getRequestSegment = (req, source) => req.validated?.[source] ?? req[source];

const resolveProjectIdsFromRequest = (req, options = {}) => {
  const {
    source = "params",
    projectIdField = "projectId",
    getProjectIds,
  } = options;
  const requestSegment = getRequestSegment(req, source);
  const projectIds = getProjectIds
    ? getProjectIds(requestSegment, req)
    : [requestSegment?.[projectIdField]];

  return normalizeIds((projectIds || []).filter(Boolean));
};

const ensureAuthenticated = (req) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401, {
      code: "AUTHENTICATION_REQUIRED",
    });
  }
};

const authorizeProjectAccess = (options = {}) => async (req, res, next) => {
  try {
    ensureAuthenticated(req);

    if (hasRole(req.user, "admin")) {
      return next();
    }

    const assignmentField = options.assignmentField || getProjectAssignmentFieldForUser(req.user);
    if (!assignmentField) {
      throw new AppError("Access denied", 403, {
        code: "ACCESS_DENIED",
      });
    }

    const projectIds = resolveProjectIdsFromRequest(req, options);

    if (projectIds.length === 0) {
      throw new AppError("Project id is required", 400, {
        code: "PROJECT_ID_REQUIRED",
      });
    }

    const accessSummary = await inspectProjectAccess({
      projectIds,
      user: req.user,
      assignmentField,
    });

    if (accessSummary.missingProjectIds.length > 0) {
      throw new AppError("Project not found", 404, {
        code: "PROJECT_NOT_FOUND",
        details: {
          projectIds: accessSummary.missingProjectIds,
        },
      });
    }

    if (accessSummary.inaccessibleProjectIds.length > 0) {
      throw new AppError(getProjectAccessDeniedMessage(req.user), 403, {
        code: "PROJECT_ACCESS_DENIED",
        details: {
          projectIds: accessSummary.inaccessibleProjectIds,
        },
      });
    }

    req.accessControl = {
      ...(req.accessControl || {}),
      projectIds: accessSummary.projectIds,
      projectMap: accessSummary.projectMap,
    };

    if (accessSummary.projectIds.length === 1) {
      req.project = accessSummary.projectMap.get(accessSummary.projectIds[0]);
    }

    next();
  } catch (error) {
    next(error);
  }
};

const authorizeTaskAction = ({ taskType, action, taskIdParam = "taskId" }) => async (req, res, next) => {
  try {
    ensureAuthenticated(req);

    if (hasRole(req.user, "admin")) {
      return next();
    }

    const config = TASK_ACCESS_CONFIG[taskType];
    if (!config) {
      throw new AppError("Unsupported task type", 500, {
        code: "RBAC_TASK_TYPE_UNSUPPORTED",
      });
    }

    const taskId = getRequestSegment(req, "params")?.[taskIdParam] ?? req.params?.[taskIdParam];
    if (!taskId) {
      throw new AppError("Task id is required", 400, {
        code: "TASK_ID_REQUIRED",
      });
    }

    const task = await config.model.findById(taskId).select("_id project createdBy status");
    if (!task) {
      throw new AppError(config.notFoundMessage, 404, {
        code: "TASK_NOT_FOUND",
      });
    }

    const project = await Project.findById(task.project).select("_id engineers supervisors");
    if (!project) {
      throw new AppError("Project not found", 404, {
        code: "PROJECT_NOT_FOUND",
      });
    }

    let isAllowed = false;
    let message = "Access denied";
    let code = "TASK_ACCESS_DENIED";

    if (action === "delete") {
      isAllowed = canDeleteTask(req.user, task) && isEngineerAssignedToProject(req.user, project);
      message = "You can only delete your own tasks in your assigned projects";
      code = "TASK_DELETE_FORBIDDEN";
    } else if (action === "review") {
      isAllowed = canReviewTask(req.user, project);
      message = "Access denied to review this task";
      code = "TASK_REVIEW_FORBIDDEN";
    } else {
      throw new AppError("Unsupported task action", 500, {
        code: "RBAC_TASK_ACTION_UNSUPPORTED",
      });
    }

    if (!isAllowed) {
      throw new AppError(message, 403, {
        code,
        details: {
          taskId,
          taskType,
          action,
        },
      });
    }

    req.accessControl = {
      ...(req.accessControl || {}),
      task,
      project,
    };
    req.task = task;
    req.project = project;

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authorizeProjectAccess,
  authorizeTaskAction,
};
