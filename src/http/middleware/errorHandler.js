const normaliseError = (err) => {
  if (err.type === "entity.parse.failed") {
    return {
      statusCode: 400,
      message: "Invalid JSON request body",
      code: "INVALID_JSON",
    };
  }

  if (err.type === "entity.too.large") {
    return {
      statusCode: 413,
      message: "Request body too large",
      code: "REQUEST_TOO_LARGE",
    };
  }

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
  const publicError = normaliseError(err);
  const isServerError = publicError.statusCode >= 500;

  // reqLogger writes the outcome once, including failures after headers were sent.
  // Known client errors use the public message so parser input is never copied.
  res.locals.requestError = {
    statusCode: publicError.statusCode,
    code: publicError.code,
    message: isServerError ? err.message : publicError.message,
    ...(publicError.errors && { errors: publicError.errors }),
    ...(isServerError && { name: err.name, errorCode: err.code, stack: err.stack }),
  };

  if (res.headersSent) {
    return next(err);
  }

  const response = {
    code: publicError.code,
    message: publicError.message,
    ...(publicError.errors && { errors: publicError.errors }),
  };

  return res.status(publicError.statusCode).json(response);
};

module.exports = { errorHandler };
