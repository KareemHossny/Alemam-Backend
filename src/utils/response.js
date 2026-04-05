const DEFAULT_ERROR_MESSAGE = "Internal Server Error";

const sendSuccess = (res, data = null, message, statusCode = 200) => {
  const payload = {
    success: true,
    data: data === undefined ? null : data,
  };

  if (message) {
    payload.message = message;
  }

  return res.status(statusCode).json(payload);
};

const buildErrorPayload = (error) => {
  const payload = {
    success: false,
    error: {
      message: error?.message || DEFAULT_ERROR_MESSAGE,
    },
  };

  if (error?.code) {
    payload.error.code = error.code;
  }

  if (error?.details !== undefined) {
    payload.error.details = error.details;
  }

  return payload;
};

const extractResultPayload = (result, defaultMessage) => {
  if (result && typeof result === "object" && !Array.isArray(result)) {
    if ("data" in result || "message" in result) {
      return {
        data: "data" in result ? result.data : null,
        message: result.message || defaultMessage,
      };
    }
  }

  return {
    data: result ?? null,
    message: defaultMessage,
  };
};

const sendError = (res, error) => {
  const statusCode = Number(error?.statusCode) || 500;
  return res.status(statusCode).json(buildErrorPayload(error));
};

module.exports = {
  sendSuccess,
  sendError,
  buildErrorPayload,
  extractResultPayload,
};
