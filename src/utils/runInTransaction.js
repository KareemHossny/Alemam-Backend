const mongoose = require("mongoose");
const AppError = require("./AppError");

const DEFAULT_TRANSACTION_OPTIONS = {
  readConcern: { level: "snapshot" },
  writeConcern: { w: "majority" },
};

const runInTransaction = async (work, options = {}) => {
  const session = await mongoose.startSession();

  try {
    let transactionResult;

    await session.withTransaction(async () => {
      transactionResult = await work(session);
    }, {
      ...DEFAULT_TRANSACTION_OPTIONS,
      ...options,
    });

    return transactionResult;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (error?.name === "ValidationError") {
      throw new AppError(error.message, 400);
    }

    if (error?.code === 11000) {
      const duplicateMessage = error?.keyPattern?.fingerprint
        ? "A matching task already exists for this project, date, title, and note."
        : "Duplicate key error";

      throw new AppError(duplicateMessage, 409);
    }

    const errorMessage = error?.codeName === "IllegalOperation"
      ? "Transaction support is unavailable. MongoDB must run as a replica set or sharded cluster."
      : "Transaction failed. All changes were rolled back.";

    throw new AppError(errorMessage, 500);
  } finally {
    await session.endSession();
  }
};

module.exports = runInTransaction;
