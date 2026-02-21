class CustomError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends CustomError {
  constructor(message, field = null) {
    super(message, 400, "VALIDATION_ERROR");
    this.field = field;
  }
}

class NotFoundError extends CustomError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}

class UnauthorizedError extends CustomError {
  constructor(message = "Unauthorized access") {
    super(message, 401, "UNAUTHORIZED");
  }
}

class ConflictError extends CustomError {
  constructor(message) {
    super(message, 409, "CONFLICT");
  }
}

class InternalServerError extends CustomError {
  constructor(message = "Internal server error") {
    super(message, 500, "INTERNAL_SERVER_ERROR");
  }
}

module.exports = {
  CustomError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ConflictError,
  InternalServerError,
};
