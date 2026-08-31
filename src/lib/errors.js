class AppError extends Error {
  constructor(message, statusCode = 500, code = "APP_ERROR", errors) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    if (errors?.length) {
      this.errors = errors;
    }

    Error.captureStackTrace?.(this, this.constructor);
  }
}

class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404, "NOT_FOUND");
  }
}

class ConflictError extends AppError {
  constructor(message = "Resource already exists", code = "CONFLICT") {
    super(message, 409, code);
  }
}

class ValidationError extends AppError {
  constructor(message = "Validation failed", errors = []) {
    const normalisedErrors = errors.map((error) => ({
      field: error.path ?? error.param ?? error.field ?? "unknown",
      message: error.msg ?? error.message ?? "Invalid value",
    }));

    super(message, 400, "VALIDATION_ERROR", normalisedErrors);
  }
}

class UnauthorisedError extends AppError {
  constructor(message = "Unauthorised", code = AUTH_CODES.UNAUTHORISED) {
    super(message, 401, code);
  }
}

class ForbiddenError extends AppError {
  constructor(message = "Permission denied") {
    super(message, 403, "PERMISSION_DENIED");
  }
}

class FeatureDisabledError extends AppError {
  constructor(message = "Feature is currently disabled") {
    super(message, 503, "FEATURE_DISABLED");
  }
}

class UploadError extends AppError {
  constructor(message, statusCode = 400, code = "UPLOAD_ERROR", tempFilePath = null) {
    super(message, statusCode, code);
    this.name = "UploadError";
    this.tempFilePath = tempFilePath;
  }
}

class FileTooLargeError extends UploadError {
  constructor(message = "File size too large", tempFilePath) {
    super(message, 413, "FILE_TOO_LARGE", tempFilePath);
    this.name = "FileTooLargeError";
  }
}

class InvalidFileTypeError extends UploadError {
  constructor(message = "Invalid file type") {
    super(message, 415, "INVALID_FILE_TYPE");
    this.name = "InvalidFileTypeError";
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
  FeatureDisabledError,
  UploadError,
  FileTooLargeError,
  InvalidFileTypeError,
  AUTH_CODES,
};
