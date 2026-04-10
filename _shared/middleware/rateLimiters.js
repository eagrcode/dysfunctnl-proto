const rateLimit = require("express-rate-limit");

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
    code: "LIMIT_EXCEEDED",
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: "Too many failed attempts, please try again later.",
    code: "LIMIT_EXCEEDED",
  },
});

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: {
    success: false,
    message: "Too many accounts created from this IP, please try again after an hour.",
    code: "LIMIT_EXCEEDED",
  },
});

// File upload limiter (for future use)
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
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
