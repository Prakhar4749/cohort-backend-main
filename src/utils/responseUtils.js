// AsyncHandler: Catches errors in async route handlers
const AsyncHandler = (asyncFunction) => {
  return async (req, res, next) => {
    try {
      await asyncFunction(req, res, next);
    } catch (err) {
      // Enhanced error logging with more details
      console.error("\n[Unhandled Error]", err.name || "Unknown Error");
      console.error(`Route: ${req.method} ${req.originalUrl}`);
      console.error(`Timestamp: ${new Date().toISOString()}`);

      // Log validation errors with details
      if (err.name === "ValidationError") {
        console.error("Validation Errors:");
        Object.keys(err.errors).forEach((field) => {
          console.error(`  - ${field}: ${err.errors[field].message}`);
        });

        // Format validation errors for response
        const validationErrors = Object.values(err.errors).map(
          (error) => error.message
        );
        const apiError = new ApiError(400, validationErrors.join(", "));
        return next(apiError);
      }

      // Log the stack trace
      console.error("Stack:", err.stack);
      console.error("--------------------------------------\n");

      next(err);
    }
  };
};

// ApiError: Standardized custom error class
class ApiError extends Error {
  constructor(statusCode, message, errors = [], stack = "") {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode >= 400 && statusCode < 500 ? "fail" : "error";
    this.errors = errors;

    if (stack) this.stack = stack;
    else if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// ApiResponse: Standardized API response class
class ApiResponse {
  constructor(code = 200, message = "OK", data = null) {
    this.code = code;
    this.status = code >= 200 && code < 300 ? "success" : "error";
    this.message = message;
    this.data = data;
  }

  send(res) {
    return res.status(this.code).json(this);
  }
}

// Helper: Generic response sender
const sendResponse = (res, code, message, data = null) => {
  return new ApiResponse(code, message, data).send(res);
};

// Helper: Success response
const successResponse = (res, data, message = "Success", code = 200) => {
  return new ApiResponse(code, message, data).send(res);
};

// Helper: Error response
const errorResponse = (
  res,
  message = "Something went wrong",
  code = 500,
  errors = []
) => {
  return new ApiResponse(code, message, { errors }).send(res);
};

// Export all
export {
  AsyncHandler,
  ApiError,
  ApiResponse,
  sendResponse,
  successResponse,
  errorResponse,
};
