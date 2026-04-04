const { getUserId, hasRole, normalizeId } = require("./role.policy");

const isAssignedToProject = (user, project, assignmentField) => {
  const userId = getUserId(user);
  const assignees = project?.[assignmentField];

  if (!userId || !Array.isArray(assignees)) {
    return false;
  }

  return assignees.some((assigneeId) => normalizeId(assigneeId) === userId);
};

const isEngineerAssignedToProject = (user, project) => isAssignedToProject(user, project, "engineers");

const isSupervisorAssignedToProject = (user, project) => isAssignedToProject(user, project, "supervisors");

const canAccessProject = (user, project) =>
  hasRole(user, "admin") || isEngineerAssignedToProject(user, project) || isSupervisorAssignedToProject(user, project);

const canManageProject = (user) => hasRole(user, "admin");

module.exports = {
  isAssignedToProject,
  isEngineerAssignedToProject,
  isSupervisorAssignedToProject,
  canAccessProject,
  canManageProject,
};
