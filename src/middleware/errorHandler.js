const { CustomError } = require("../utils/errors");

// Global error handling middleware
const errorHandler = (error, req, res, next) => {
  console.error("Error occurred:", error);

  // Default error response
  let statusCode = 500;
  let message = "Internal Server Error";
  let code = "INTERNAL_SERVER_ERROR";
  let details = null;

  // Handle custom errors
  if (error instanceof CustomError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code;

    // Add field information for validation errors
    if (error.field) {
      details = { field: error.field };
    }
  }

  // Handle specific error types
  else if (error.name === "ValidationError") {
    statusCode = 400;
    message = error.message;
    code = "VALIDATION_ERROR";
  } else if (error.name === "CastError") {
    statusCode = 400;
    message = "Invalid ID format";
    code = "INVALID_ID";
  } else if (error.code === 11000) {
    // MongoDB duplicate key error
    statusCode = 409;
    message = "Resource already exists";
    code = "DUPLICATE_RESOURCE";

    // Extract field information from MongoDB error
    const field = Object.keys(error.keyValue)[0];
    details = { field };
  } else if (error.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
    code = "INVALID_TOKEN";
  } else if (error.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
    code = "TOKEN_EXPIRED";
  }

  // Log error details in development
  if (process.env.NODE_ENV === "development") {
    console.error("Error stack:", error.stack);
  }

  // Prepare error response
  const errorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
      ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
    },
  };

  // Send error response
  res.status(statusCode).json(errorResponse);
};

// 404 Not Found middleware
const notFoundHandler = (req, res, next) => {
  const error = {
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
  };

  res.status(404).json(error);
};

// Async wrapper to catch errors in async route handlers
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
};
