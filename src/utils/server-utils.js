// AsyncHandler
const AsyncHandler = (asyncFunction) => {
  return async (req, res, next) => {
    try {
      await asyncFunction(req, res, next);
    } catch (err) {
      next(err);
    }
  };
};

// API ERROR FUNCTION
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.status = statusCode >= 400 && statusCode < 500 ? "fail" : "error";

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// API RESPONSE FUNCTION
class ApiResponse {
  constructor(code, message, data) {
    this.code = code;
    this.status = code >= 200 && code < 300 ? "success" : "error";
    this.message = message;
    this.data = data;
  }
}

export { AsyncHandler, ApiError, ApiResponse };
