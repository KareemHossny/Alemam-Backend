const { getUserId, hasRole, normalizeId } = require("./role.policy");

const getProjectAssignmentFieldForUser = (user) => {
  if (hasRole(user, "engineer")) {
    return "engineers";
  }

  if (hasRole(user, "supervisor")) {
    return "supervisors";
  }

  return null;
};

const getProjectAccessDeniedMessage = (user) =>
  hasRole(user, "supervisor")
    ? "You are not assigned as a supervisor on this project"
    : "You are not assigned to this project";

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
  getProjectAssignmentFieldForUser,
  getProjectAccessDeniedMessage,
  isAssignedToProject,
  isEngineerAssignedToProject,
  isSupervisorAssignedToProject,
  canAccessProject,
  canManageProject,
};
