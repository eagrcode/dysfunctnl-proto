const Router = require("express").Router;
const {
  handleAddComment,
  handleUpdateComment,
  handleDeleteComment,
} = require("./comments.controller");
const validateUUIDParams = require("../../../../_shared/middleware/validateUUID");

const mediaCommentsRouter = Router({ mergeParams: true });

mediaCommentsRouter.post("/", handleAddComment);

mediaCommentsRouter.use("/:commentId", validateUUIDParams);

mediaCommentsRouter.patch("/:commentId", handleUpdateComment);
mediaCommentsRouter.delete("/:commentId", handleDeleteComment);

module.exports = mediaCommentsRouter;
