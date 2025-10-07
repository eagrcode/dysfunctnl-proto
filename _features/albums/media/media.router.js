const Router = require("express").Router;
const {
  handleAddMedia,
  handleGetMediaById,
  handleDeleteMediaById,
  handleUpdateMediaById,
} = require("../../controllers/albums/media/media.controller");

const mediaRouter = Router({ mergeParams: true });

mediaRouter.post("/", handleAddMedia);
mediaRouter.get("/:mediaId", handleGetMediaById);
mediaRouter.patch("/:mediaId", handleUpdateMediaById);
mediaRouter.delete("/:mediaId", handleDeleteMediaById);

module.exports = mediaRouter;
