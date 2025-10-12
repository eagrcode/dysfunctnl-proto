// middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  console.error("Error:", {
    message: err.message,
    statusCode: err.statusCode,
    stack: err.stack,
    validationError: err.errors,
  });

  if (err.isOperational) {
    const response = {
      success: false,
      error: err.message,
      code: err.code,
    };

    if (err.errors) {
      response.errors = err.errors;
    }

    return res.status(err.statusCode).json(response);
  }

  // Generic error
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === "production" ? "An unexpected error occurred" : err.message,
  });
};

module.exports = { errorHandler };
