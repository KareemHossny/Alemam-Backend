const mongoose = require("mongoose");
const AppError = require("./AppError");

const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

const normalizeUtcDateOnly = (dateString) => {
  const match = DATE_ONLY_REGEX.exec(dateString || "");

  if (!match) {
    throw new AppError("Invalid date", 400);
  }

  const [, year, month, day] = match;

  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
};

const buildDayRangeFilter = (dateString) => {
  const start = normalizeUtcDateOnly(dateString);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return {
    $gte: start,
    $lt: end,
  };
};

const getExclusiveEndDate = (dateString) => {
  const endDate = normalizeUtcDateOnly(dateString);
  endDate.setUTCDate(endDate.getUTCDate() + 1);
  return endDate;
};

const buildTaskDateFilter = (filters = {}) => {
  if (filters.date) {
    return buildDayRangeFilter(filters.date);
  }

  const rangeFilter = {};

  if (filters.dateFrom) {
    rangeFilter.$gte = normalizeUtcDateOnly(filters.dateFrom);
  }

  if (filters.dateTo) {
    rangeFilter.$lt = getExclusiveEndDate(filters.dateTo);
  }

  return Object.keys(rangeFilter).length > 0 ? rangeFilter : undefined;
};

const buildTaskQuery = (filters = {}) => {
  const query = {};

  if (filters.projectId) {
    query.project = filters.projectId;
  }

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.userId) {
    query.createdBy = filters.userId;
  }

  const dateFilter = buildTaskDateFilter(filters);
  if (dateFilter) {
    query.date = dateFilter;
  }

  return query;
};

const mergeMatchConditions = (...conditions) => {
  const normalizedConditions = conditions.filter(
    (condition) => condition && Object.keys(condition).length > 0
  );

  if (normalizedConditions.length === 0) {
    return {};
  }

  if (normalizedConditions.length === 1) {
    return normalizedConditions[0];
  }

  return {
    $and: normalizedConditions,
  };
};

const toObjectId = (value) =>
  value instanceof mongoose.Types.ObjectId
    ? value
    : new mongoose.Types.ObjectId(String(value));

const normalizeObjectIdList = (values = []) => values.map((value) => toObjectId(value));

const buildAggregationTaskMatch = (filters = {}, options = {}) => {
  const baseMatch = {};
  const optionMatch = {};

  if (filters.projectId) {
    baseMatch.project = toObjectId(filters.projectId);
  }

  if (filters.status) {
    baseMatch.status = filters.status;
  }

  if (filters.userId) {
    baseMatch.createdBy = toObjectId(filters.userId);
  }

  const dateFilter = buildTaskDateFilter(filters);
  if (dateFilter) {
    baseMatch.date = dateFilter;
  }

  if (options.projectId) {
    optionMatch.project = toObjectId(options.projectId);
  }

  if (options.projectIds?.length) {
    optionMatch.project = {
      $in: normalizeObjectIdList(options.projectIds),
    };
  }

  if (options.createdById) {
    optionMatch.createdBy = toObjectId(options.createdById);
  }

  if (options.createdByIds?.length) {
    optionMatch.createdBy = {
      $in: normalizeObjectIdList(options.createdByIds),
    };
  }

  return mergeMatchConditions(baseMatch, optionMatch, options.extraMatch);
};

module.exports = {
  normalizeUtcDateOnly,
  buildDayRangeFilter,
  getExclusiveEndDate,
  buildTaskDateFilter,
  buildTaskQuery,
  buildAggregationTaskMatch,
  mergeMatchConditions,
  toObjectId,
  normalizeObjectIdList,
};
