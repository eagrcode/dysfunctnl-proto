const Router = require("express").Router;
const {
  handleAddMedia,
  handleGetMediaById,
  handleDeleteMediaById,
  handleUpdateMediaById,
} = require("./media.controller");
const { upload, handlePhotoUpload } = require("./media.upload.controller");

const mediaRouter = Router({ mergeParams: true });

mediaRouter.post("/upload", upload, handlePhotoUpload);

mediaRouter.get("/:mediaId", handleGetMediaById);
mediaRouter.patch("/:mediaId", handleUpdateMediaById);
mediaRouter.delete("/:mediaId", handleDeleteMediaById);

module.exports = mediaRouter;
