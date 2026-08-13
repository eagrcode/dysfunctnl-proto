const rateLimit = require("express-rate-limit");

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    message: "Too many requests from this IP, please try again later in 15 minutes.",
    code: "LIMIT_EXCEEDED",
  },
});

const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: {
    message: "Too many failed attempts, please try again in 60 seconds.",
    code: "LIMIT_EXCEEDED",
  },
});

const registrationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: {
    message: "Too many accounts created from this IP, please try again after 5 minutes.",
    code: "LIMIT_EXCEEDED",
  },
});

// File upload limiter (for future use)
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    message: "Too many uploads, please try again later.",
    code: "LIMIT_EXCEEDED",
  },
});

module.exports = {
  generalLimiter,
  authLimiter,
  registrationLimiter,
  uploadLimiter,
};
