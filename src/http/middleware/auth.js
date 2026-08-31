const jwt = require("jsonwebtoken");
const { AUTH_CODES } = require("../../lib/errors");

const reject = (res, message, code, reason = message) => {
  res.locals.requestError = { statusCode: 401, code, message: reason };

  return res.status(401).json({
    message,
    code,
  });
};

const authenticate = (req, res, next) => {
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
      return reject(res, "Invalid token", AUTH_CODES.ACCESS_TOKEN_EXPIRED, "Access token expired");
    }

    if (error) {
      return reject(res, "Invalid token", AUTH_CODES.ACCESS_TOKEN_INVALID, error.message);
    }

    req.user = user;
    next();
  });
};

module.exports = authenticate;
