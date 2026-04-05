const User = require("./user.model");

const findByEmail = (email, { includeDeleted = false } = {}) => {
  const query = User.findOne({ email });

  if (includeDeleted) {
    query.setOptions({ includeDeleted: true });
  }

  return query;
};

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

const buildUser = (payload) => new User(payload);

const save = (user, { session } = {}) => user.save(session ? { session } : undefined);

module.exports = {
  findByEmail,
  findById,
  listActiveUsers,
  buildUser,
  save,
};
