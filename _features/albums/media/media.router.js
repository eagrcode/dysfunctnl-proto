const Router = require("express").Router;
const {
  handleAddMedia,
  handleGetMediaById,
  handleDeleteMediaById,
  handleUpdateMediaById,
} = require("../../controllers/albums/media/media.controller");

const mediaRouter = Router({ mergeParams: true });

mediaRouter.post("/", authenticate, handleAddMedia);
mediaRouter.get("/:mediaId", authenticate, handleGetMediaById);
mediaRouter.patch("/:mediaId", authenticate, handleUpdateMediaById);
mediaRouter.delete("/:mediaId", authenticate, handleDeleteMediaById);

module.exports = mediaRouter;
