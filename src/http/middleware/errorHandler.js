const { logger } = require("../../lib/logger");

const normaliseError = (err) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return {
      statusCode: 413,
      message: "File too large",
      code: "FILE_TOO_LARGE",
    };
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return {
      statusCode: 400,
      message: "Unexpected file field name",
      code: "INVALID_FIELD",
    };
  }

  if (
    err.message?.includes("Input file") ||
    err.message?.includes("VipsJpeg") ||
    err.message?.includes("unsupported image format")
  ) {
    return {
      statusCode: 400,
      message: "Invalid or corrupted image file",
      code: "INVALID_IMAGE",
    };
  }

  if (err.isOperational) {
    return {
      statusCode: err.statusCode,
      code: err.code,
      message: err.message,
      ...(err.errors?.length && { errors: err.errors }),
    };
  }

  return {
    statusCode: 500,
    message: "An unexpected error occurred",
    code: "INTERNAL_ERROR",
  };
};

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const publicError = normaliseError(err);
  const logData = {
    method: req.method,
    path: req.originalUrl,
    statusCode: publicError.statusCode,
    code: publicError.code,
    message: err.message,
    ...(publicError.errors && { errors: publicError.errors }),
    ...(publicError.statusCode >= 500 && { stack: err.stack }),
  };

  if (publicError.statusCode >= 500) {
    logger.error("Request failed", logData);
  } else {
    logger.warn("Request rejected", logData);
  }

  const response = {
    code: publicError.code,
    message: publicError.message,
    ...(publicError.errors && { errors: publicError.errors }),
  };

  return res.status(publicError.statusCode).json(response);
};

module.exports = { errorHandler };
