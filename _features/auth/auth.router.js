const { Router } = require("express");
const { authLimiter, registrationLimiter } = require("../../_shared/middleware/rateLimiters");
const {
  handleUserRegistration,
  handleUserLogin,
  handleRefreshAccessToken,
} = require("./auth.controller");

const authRouter = Router();

authRouter.post("/register", registrationLimiter, handleUserRegistration);
authRouter.post("/login", authLimiter, handleUserLogin);
authRouter.post("/refresh", handleRefreshAccessToken);

module.exports = authRouter;
