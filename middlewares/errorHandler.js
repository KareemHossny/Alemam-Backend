const AppError = require("../src/utils/AppError");
const { sendError } = require("../src/utils/response");

const errorHandler = (err, req, res, next) => {
  console.error("API Error:", err);

  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof AppError) {
    return sendError(res, err);
  }

  return sendError(
    res,
    new AppError("Internal Server Error", 500, {
      code: "INTERNAL_SERVER_ERROR",
    })
  );
};

module.exports = errorHandler;
