const jwt = require("jsonwebtoken");
const { AUTH_CODES } = require("../../lib/errors");
const { logger } = require("../../lib/logger");

const reject = (res, message, code) =>
  res.status(401).json({
    message,
    code,
  });

const authenticate = (req, res, next) => {
  logger.info("Authenticating request", {
    method: req.method,
    url: req.originalUrl,
  });

  const authorization = req.get("authorization");

  if (!authorization) {
    return reject(res, "Access token required", AUTH_CODES.ACCESS_TOKEN_MISSING);
  }

  const match = authorization.match(/^Bearer\s+(\S+)$/i);

  if (!match) {
    return reject(res, "Invalid token", AUTH_CODES.ACCESS_TOKEN_INVALID);
  }

  const token = match[1];

  jwt.verify(token, process.env.JWT_SECRET, (error, user) => {
    if (error?.name === "TokenExpiredError") {
      logger.warn("Access token expired", {
        method: req.method,
        url: req.originalUrl,
      });
      return reject(res, "Invalid token", AUTH_CODES.ACCESS_TOKEN_EXPIRED);
    }

    if (error) {
      logger.warn("Access token invalid", {
        method: req.method,
        url: req.originalUrl,
        reason: error.message,
      });
      return reject(res, "Invalid token", AUTH_CODES.ACCESS_TOKEN_INVALID);
    }

    req.user = user;
    next();
  });
};

module.exports = authenticate;
