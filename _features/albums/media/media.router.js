const Router = require("express").Router;
const mediaCommentsRouter = require("./comments/comments.router");
const {
  handleGetMediaById,
  handleGetMediaByIdWithComments,
  handleDeleteMediaById,
  handleUpdateMediaById,
} = require("./media.controller");
const validateUUIDParams = require("../../../_shared/middleware/validateUUID");
const { FeatureDisabledError } = require("../../../_shared/utils/errors");
const { featureFlags } = require("../../../_shared/utils/featureFlags");

const mediaRouter = Router({ mergeParams: true });

if (featureFlags.mediaUploads) {
  const { upload, handlePhotoUpload } = require("./media.upload.controller");
  mediaRouter.post("/upload", upload, handlePhotoUpload);
} else {
  mediaRouter.post("/upload", () => {
    throw new FeatureDisabledError("Media uploads are currently disabled");
  });
}

mediaRouter.use("/:mediaId", validateUUIDParams);

mediaRouter.get("/:mediaId", handleGetMediaById);
mediaRouter.patch("/:mediaId", handleUpdateMediaById);
mediaRouter.delete("/:mediaId", handleDeleteMediaById);
mediaRouter.get("/:mediaId/comments", handleGetMediaByIdWithComments);

mediaRouter.use("/:mediaId/comments", mediaCommentsRouter);

module.exports = mediaRouter;
