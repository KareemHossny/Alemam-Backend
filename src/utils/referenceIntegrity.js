const User = require("../../models/User");
const Project = require("../../models/Project");
const DailyTask = require("../../models/dailyTask");
const MonthlyTask = require("../../models/monthlyTask");
const AppError = require("./AppError");

const normalizeIds = (ids = []) => [...new Set(ids.map((id) => String(id)))];

const formatIdList = (ids) => ids.join(", ");

const validateProjectAssignments = async ({ engineers = [], supervisors = [] }, options = {}) => {
  const { session } = options;
  const engineerIds = normalizeIds(engineers);
  const supervisorIds = normalizeIds(supervisors);
  const supervisorIdSet = new Set(supervisorIds);
  const overlappingIds = engineerIds.filter((id) => supervisorIdSet.has(id));

  if (overlappingIds.length > 0) {
    throw new AppError(
      `The same user cannot be assigned as both engineer and supervisor: ${formatIdList(overlappingIds)}`,
      400
    );
  }

  const referencedUserIds = normalizeIds([...engineerIds, ...supervisorIds]);

  if (referencedUserIds.length === 0) {
    return {
      engineers: engineerIds,
      supervisors: supervisorIds,
    };
  }

  const users = await User.find({
    _id: { $in: referencedUserIds },
  })
    .session(session || null)
    .select("_id role")
    .lean();

  const userMap = new Map(users.map((user) => [String(user._id), user]));
  const missingUserIds = referencedUserIds.filter((id) => !userMap.has(id));

  if (missingUserIds.length > 0) {
    throw new AppError(`Referenced users do not exist or are deleted: ${formatIdList(missingUserIds)}`, 400);
  }

  const invalidEngineerIds = engineerIds.filter((id) => userMap.get(id)?.role !== "engineer");
  if (invalidEngineerIds.length > 0) {
    throw new AppError(`These users are not valid engineers: ${formatIdList(invalidEngineerIds)}`, 400);
  }

  const invalidSupervisorIds = supervisorIds.filter((id) => userMap.get(id)?.role !== "supervisor");
  if (invalidSupervisorIds.length > 0) {
    throw new AppError(`These users are not valid supervisors: ${formatIdList(invalidSupervisorIds)}`, 400);
  }

  return {
    engineers: engineerIds,
    supervisors: supervisorIds,
  };
};

const syncProjectAssignments = async ({
  projectId,
  previousEngineerIds = [],
  previousSupervisorIds = [],
  nextEngineerIds = [],
  nextSupervisorIds = [],
  session,
}) => {
  const previousAssigneeIds = normalizeIds([...previousEngineerIds, ...previousSupervisorIds]);
  const nextAssigneeIds = normalizeIds([...nextEngineerIds, ...nextSupervisorIds]);
  const nextAssigneeIdSet = new Set(nextAssigneeIds);
  const previousAssigneeIdSet = new Set(previousAssigneeIds);

  const assigneesToAdd = nextAssigneeIds.filter((id) => !previousAssigneeIdSet.has(id));
  const assigneesToRemove = previousAssigneeIds.filter((id) => !nextAssigneeIdSet.has(id));

  if (assigneesToAdd.length > 0) {
    await User.updateMany(
      { _id: { $in: assigneesToAdd } },
      {
        $addToSet: {
          assignedProjects: projectId,
        },
      },
      { session }
    );
  }

  if (assigneesToRemove.length > 0) {
    await User.updateMany(
      { _id: { $in: assigneesToRemove } },
      {
        $pull: {
          assignedProjects: projectId,
        },
      },
      { session }
    );
  }
};

const getUserReferenceSummary = async (userId, options = {}) => {
  const { session } = options;
  const [
    engineerProjectCount,
    supervisorProjectCount,
    dailyTaskOwnerCount,
    dailyTaskReviewerCount,
    monthlyTaskOwnerCount,
    monthlyTaskReviewerCount,
  ] = await Promise.all([
    Project.countDocuments({ engineers: userId }).session(session || null),
    Project.countDocuments({ supervisors: userId }).session(session || null),
    DailyTask.countDocuments({ createdBy: userId }).session(session || null),
    DailyTask.countDocuments({ reviewedBy: userId }).session(session || null),
    MonthlyTask.countDocuments({ createdBy: userId }).session(session || null),
    MonthlyTask.countDocuments({ reviewedBy: userId }).session(session || null),
  ]);

  return {
    engineerProjectCount,
    supervisorProjectCount,
    dailyTaskOwnerCount,
    dailyTaskReviewerCount,
    monthlyTaskOwnerCount,
    monthlyTaskReviewerCount,
  };
};

const buildUserDeletionBlockers = (referenceSummary) => {
  const blockers = [];

  if (referenceSummary.engineerProjectCount > 0) {
    blockers.push(`${referenceSummary.engineerProjectCount} engineer project assignments`);
  }

  if (referenceSummary.supervisorProjectCount > 0) {
    blockers.push(`${referenceSummary.supervisorProjectCount} supervisor project assignments`);
  }

  if (referenceSummary.dailyTaskOwnerCount > 0) {
    blockers.push(`${referenceSummary.dailyTaskOwnerCount} daily tasks created`);
  }

  if (referenceSummary.dailyTaskReviewerCount > 0) {
    blockers.push(`${referenceSummary.dailyTaskReviewerCount} daily task reviews`);
  }

  if (referenceSummary.monthlyTaskOwnerCount > 0) {
    blockers.push(`${referenceSummary.monthlyTaskOwnerCount} monthly tasks created`);
  }

  if (referenceSummary.monthlyTaskReviewerCount > 0) {
    blockers.push(`${referenceSummary.monthlyTaskReviewerCount} monthly task reviews`);
  }

  return blockers;
};

module.exports = {
  normalizeIds,
  validateProjectAssignments,
  syncProjectAssignments,
  getUserReferenceSummary,
  buildUserDeletionBlockers,
};
