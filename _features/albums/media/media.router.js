const Router = require("express").Router;
const mediaCommentsRouter = require("./comments/comments.router");
const {
  handleGetMediaById,
  handleGetMediaByIdWithComments,
  handleDeleteMediaById,
  handleUpdateMediaById,
} = require("./media.controller");
const { upload, handlePhotoUpload } = require("./media.upload.controller");
const validateUUIDParams = require("../../../_shared/middleware/validateUUID");

const mediaRouter = Router({ mergeParams: true });

mediaRouter.use("/:mediaId", validateUUIDParams);

mediaRouter.post("/upload", upload, handlePhotoUpload);
mediaRouter.get("/:mediaId", handleGetMediaById);
mediaRouter.patch("/:mediaId", handleUpdateMediaById);
mediaRouter.delete("/:mediaId", handleDeleteMediaById);
mediaRouter.get("/:mediaId/comments", handleGetMediaByIdWithComments);

mediaRouter.use("/:mediaId/comments", mediaCommentsRouter);

module.exports = mediaRouter;
