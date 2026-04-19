const User = require("./user.model");

const findByEmail = (email, { includeDeleted = false } = {}) => {
  const query = User.findOne({ email: String(email || "").trim().toLowerCase() });

  if (includeDeleted) {
    query.setOptions({ includeDeleted: true });
  }

  return query;
};

const findByEmailForAuth = (email, { includeDeleted = false } = {}) =>
  findByEmail(email, { includeDeleted }).select("+password");

const findById = (id, { includeDeleted = false, session, select } = {}) => {
  let query = User.findById(id);

  if (includeDeleted) {
    query = query.setOptions({ includeDeleted: true });
  }

  if (session) {
    query = query.session(session);
  }

  if (select) {
    query = query.select(select);
  }

  return query;
};

const listActiveUsers = () => User.find().select("-password -deletedAt -isDeleted").lean();

const countActiveUsersByRole = (role, { session } = {}) => {
  let query = User.countDocuments({ role });

  if (session) {
    query = query.session(session);
  }

  return query;
};

const buildUser = (payload) => new User(payload);

const save = (user, { session } = {}) => user.save(session ? { session } : undefined);

module.exports = {
  findByEmail,
  findByEmailForAuth,
  findById,
  listActiveUsers,
  countActiveUsersByRole,
  buildUser,
  save,
};
