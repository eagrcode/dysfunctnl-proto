// middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  console.error("Error:", {
    message: err.message,
    ...(err.conditions && { conditions: err.conditions }),
    statusCode: err.statusCode,
    errorCode: err.code,
    ...(err.errors && { validationError: err.errors }),
    stack: err.stack,
  });

  if (err.isOperational) {
    const response = {
      success: false,
      message: err.message,
      code: err.code,
    };

    if (err.errors) {
      response.errors = err.errors;
    }

    return res.status(err.statusCode).json(response);
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      error: "File too large",
      code: "FILE_TOO_LARGE",
    });
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({
      success: false,
      error: "Unexpected file field name",
      code: "INVALID_FIELD",
    });
  }

  if (
    err.message?.includes("Input file") ||
    err.message?.includes("VipsJpeg") ||
    err.message?.includes("unsupported image format")
  ) {
    return res.status(400).json({
      success: false,
      error: "Invalid or corrupted image file",
      code: "INVALID_IMAGE",
    });
  }

  // Generic error
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === "production" ? "An unexpected error occurred" : err.message,
  });
};

module.exports = { errorHandler };
