const { hasRole, getUserId, normalizeId } = require("./role.policy");
const { isEngineerAssignedToProject, isSupervisorAssignedToProject } = require("./project.policy");

const canCreateTask = (user, project) => hasRole(user, "engineer") && isEngineerAssignedToProject(user, project);

const canDeleteTask = (user, task) => {
  const userId = getUserId(user);
  return hasRole(user, "engineer") && normalizeId(task?.createdBy) === userId;
};

const canReviewTask = (user, project) => hasRole(user, "supervisor") && isSupervisorAssignedToProject(user, project);

module.exports = {
  canCreateTask,
  canDeleteTask,
  canReviewTask,
};
