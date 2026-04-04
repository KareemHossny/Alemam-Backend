class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;

    Error.captureStackTrace?.(this, this.constructor);
  }

  static rethrow(error, fallbackMessage, fallbackStatusCode = 500) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(fallbackMessage, fallbackStatusCode);
  }
}

module.exports = AppError;
