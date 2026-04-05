class AppError extends Error {
  constructor(message, statusCode, options = {}) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = options.code;
    this.details = options.details;
    this.isOperational = true;

    Error.captureStackTrace?.(this, this.constructor);
  }

  static rethrow(error, fallbackMessage, fallbackStatusCode = 500, fallbackOptions = {}) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(fallbackMessage, fallbackStatusCode, fallbackOptions);
  }
}

module.exports = AppError;
