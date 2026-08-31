const { Router } = require("express");
const {
  handleGetUserProfile,
  handleDeleteUserAccount,
  handleUpdateUserProfile,
} = require("./user.controller");

const userRouter = Router();

userRouter.get("/me", handleGetUserProfile);
userRouter.patch("/me", handleUpdateUserProfile);
userRouter.delete("/me", handleDeleteUserAccount);

module.exports = userRouter;
