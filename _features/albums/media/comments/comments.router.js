const Router = require("express").Router;

const mediaCommentsRouter = Router({ mergeParams: true });

mediaCommentsRouter.get("/", (req, res) => {
  res.send(`Get comments for media ID: ${req.params.mediaId}`);
});
mediaCommentsRouter.post("/", (req, res) => {
  res.send(`Add comment to media ID: ${req.params.mediaId}`);
});
mediaCommentsRouter.patch("/:commentId", (req, res) => {
  res.send(`Update comment ID: ${req.params.commentId} for media ID: ${req.params.mediaId}`);
});
mediaCommentsRouter.delete("/:commentId", (req, res) => {
  res.send(`Delete comment ID: ${req.params.commentId} from media ID: ${req.params.mediaId}`);
});

module.exports = mediaCommentsRouter;
