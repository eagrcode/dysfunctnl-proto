class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Distinguishes from programming errors
    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404);
    this.code = "NOT_FOUND";
  }
}

class ConflictError extends AppError {
  constructor(message = "Resource already exists") {
    super(message, 409);
    this.code = "CONFLICT";
  }
}

class ValidationError extends AppError {
  constructor(message = "Validation failed", errors = []) {
    super(message, 400);
    this.code = "VALIDATION_ERROR";
    this.errors = errors;
  }
}

class UnauthorisedError extends AppError {
  constructor(message = "Unauthorised") {
    super(message, 401);
    this.code = "UNAUTHORISED";
  }
}

class ForbiddenError extends AppError {
  constructor(message = "Permission denied") {
    super(message, 403);
    this.code = "PERMISSION_DENIED";
  }
}

module.exports = {
  AppError,
  NotFoundError,
  ConflictError,
  ValidationError,
  UnauthorisedError,
  ForbiddenError,
};
