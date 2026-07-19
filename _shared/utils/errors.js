class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404);
    this.code = "NOT_FOUND";
  }
}

class ConflictError extends AppError {
  constructor(message = "Resource already exists", code = "CONFLICT") {
    super(message, 409);
    this.code = code;
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
  constructor(message = "Unauthorised", code = AUTH_CODES.UNAUTHORISED) {
    super(message, 401);
    this.code = code;
  }
}

class ForbiddenError extends AppError {
  constructor(message = "Permission denied") {
    super(message, 403);
    this.code = "PERMISSION_DENIED";
  }
}

class FailedActionError extends AppError {
  constructor(message = "", conditions = {}) {
    super(message, 403);
    this.conditions = conditions;
    this.code = "ACTION_FAILED";
  }
}

class UploadError extends AppError {
  constructor(message, statusCode = 400, tempFilePath = null) {
    super(message, statusCode);
    this.name = "UploadError";
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

const AUTH_CODES = Object.freeze({
  UNAUTHORISED: "UNAUTHORISED",
  ACCESS_TOKEN_MISSING: "ACCESS_TOKEN_MISSING",
  ACCESS_TOKEN_EXPIRED: "ACCESS_TOKEN_EXPIRED",
  ACCESS_TOKEN_INVALID: "ACCESS_TOKEN_INVALID",
  REFRESH_TOKEN_REQUIRED: "REFRESH_TOKEN_REQUIRED",
  REFRESH_TOKEN_INVALID: "REFRESH_TOKEN_INVALID",
  EMAIL_ALREADY_EXISTS: "EMAIL_ALREADY_EXISTS",
});

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
  AUTH_CODES,
};
