const rateLimit = require("express-rate-limit");

const handleRateLimit = (req, res, next, options) => {
  res.locals.requestError = {
    statusCode: options.statusCode,
    code: options.message.code,
    message: options.message.message,
  };

  return res.status(options.statusCode).json(options.message);
};

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: {
    message: "Too many requests from this IP, please try again later.",
    code: "LIMIT_EXCEEDED",
  },
  handler: handleRateLimit,
});

const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: {
    message: "Too many failed attempts, please try again in 60 seconds.",
    code: "LIMIT_EXCEEDED",
  },
  handler: handleRateLimit,
});

const registrationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: {
    message: "Too many accounts created from this IP, please try again after 5 minutes.",
    code: "LIMIT_EXCEEDED",
  },
  handler: handleRateLimit,
});

// File upload limiter (for future use)
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    message: "Too many uploads, please try again later.",
    code: "LIMIT_EXCEEDED",
  },
  handler: handleRateLimit,
});

module.exports = {
  generalLimiter,
  authLimiter,
  registrationLimiter,
  uploadLimiter,
};
