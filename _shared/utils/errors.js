class AppError extends Error {
  constructor(message, conditions, statusCode) {
    super(message);
    this.conditions = conditions ?? null;
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

class NotFoundError extends AppError {
  constructor(message = "Resource not found", conditions = {}) {
    super(message, conditions, 404);
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
  constructor(message = "Validation failed", conditions = {}, errors = []) {
    super(message, conditions, 400);
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
  constructor(message = "Permission denied", conditions = {}) {
    super(message, conditions, 403);
    this.code = "PERMISSION_DENIED";
  }
}

class FailedActionError extends AppError {
  constructor(message = "", conditions = {}) {
    super(message, conditions, 403);
    this.code = "ACTION_FAILED";
  }
}

class UploadError extends AppError {
  constructor(message, statusCode = 400, tempFilePath = null) {
    super(message);
    this.name = "UploadError";
    this.statusCode = statusCode;
    this.tempFilePath = tempFilePath;
  }
}

class FileTooLargeError extends UploadError {
  constructor(message = "File size too large", tempFilePath) {
    super(message, 413, tempFilePath);
    this.name = "FileTooLargeError";
  }
}

class InvalidFileTypeError extends UploadError {
  constructor(message = "Invalid file type") {
    super(message, 415);
    this.code = "INVALID_FILE_TYPE";
  }
}

module.exports = {
  AppError,
  NotFoundError,
  ConflictError,
  ValidationError,
  UnauthorisedError,
  ForbiddenError,
  UploadError,
  FileTooLargeError,
  InvalidFileTypeError,
  FailedActionError,
};
