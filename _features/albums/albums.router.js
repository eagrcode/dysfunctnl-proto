const { Router } = require("express");
const mediaRouter = require("./media/media.router");
const {
  handleAddAlbum,
  handleGetAllAlbumsByGroupId,
  handleGetAlbumById,
  handleDeleteAlbumById,
  handleUpdateAlbumById,
} = require("../controllers/albumsController");

const albumsRouter = Router({ mergeParams: true });

// ALBUM ROUTES
albumsRouter.get("/", handleGetAllAlbumsByGroupId);
albumsRouter.post("/", handleAddAlbum);
albumsRouter.get("/:albumId", handleGetAlbumById);
albumsRouter.patch("/:albumId", handleUpdateAlbumById);
albumsRouter.delete("/:albumId", handleDeleteAlbumById);

// NESTED MEDIA ROUTES
albumsRouter.use("/:albumId/media", mediaRouter);

module.exports = albumsRouter;
