const { Router } = require("express");
const mediaRouter = require("./media/media.router");
const {
  handleAddAlbum,
  handleGetAllAlbumsByGroupId,
  handleGetAlbumById,
  handleGetAlbumByIdWithMedia,
  handleDeleteAlbumById,
  handleUpdateAlbumById,
} = require("./albums.controller");
const validateUUIDParams = require("../../_shared/middleware/validateUUID");

const albumsRouter = Router({ mergeParams: true });

albumsRouter.use("/:albumId", validateUUIDParams);

// ALBUM ROUTES
albumsRouter.get("/", handleGetAllAlbumsByGroupId);
albumsRouter.post("/", handleAddAlbum);
albumsRouter.get("/:albumId", handleGetAlbumById);
albumsRouter.patch("/:albumId", handleUpdateAlbumById);
albumsRouter.delete("/:albumId", handleDeleteAlbumById);
albumsRouter.get("/:albumId/media", handleGetAlbumByIdWithMedia);

// NESTED MEDIA ROUTES
albumsRouter.use("/:albumId/media", mediaRouter);

module.exports = albumsRouter;
