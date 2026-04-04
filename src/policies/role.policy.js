const normalizeId = (value) => {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value);
};

const getUserId = (user) => normalizeId(user?.id ?? user?._id);

const hasRole = (user, roles) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  return !!user && allowedRoles.includes(user.role);
};

module.exports = {
  normalizeId,
  getUserId,
  hasRole,
};
