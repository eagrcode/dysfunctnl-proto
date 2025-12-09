const Router = require("express").Router;
const {
  handleAddComment,
  handleUpdateComment,
  handleDeleteComment,
} = require("./comments.controller");

const mediaCommentsRouter = Router({ mergeParams: true });

mediaCommentsRouter.post("/", handleAddComment);
mediaCommentsRouter.patch("/:commentId", handleUpdateComment);
mediaCommentsRouter.delete("/:commentId", handleDeleteComment);

module.exports = mediaCommentsRouter;
