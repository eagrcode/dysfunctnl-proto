const { Router } = require("express");
const {
  handleUserRegistration,
  handleUserLogin,
  handleRefreshToken,
} = require("./auth.controller");

const authRouter = Router();

// Register a new user
authRouter.post("/register", handleUserRegistration);

// Login to get JWT and refresh token
authRouter.post("/login", handleUserLogin);

// Refresh access token
// authRouter.post("/refresh", handleRefreshToken);

module.exports = authRouter;
