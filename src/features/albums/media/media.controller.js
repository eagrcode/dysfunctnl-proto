const fs = require("fs").promises;
const path = require("path");
const uploadConfig = require("../../../config/upload-config");
const { logger } = require("../../../lib/logger");
const {
  getMediaById,
  getMediaByIdWithComments,
  deleteMediaById,
  updateMediaById,
  getFilenameById,
} = require("./media.model");

// GET MEDIA BY ID
const handleGetMediaById = async (req, res) => {
  const { groupId, albumId, mediaId } = req.params;

  const media = await getMediaById(groupId, albumId, mediaId);

  res.status(200).json(media);
};

// GET MEDIA BY ID
const handleGetMediaByIdWithComments = async (req, res) => {
  const { groupId, albumId, mediaId } = req.params;

  const media = await getMediaByIdWithComments(groupId, albumId, mediaId);

  res.status(200).json(media);
};

// DELETE MEDIA BY ID
const handleDeleteMediaById = async (req, res) => {
  const { groupId, albumId, mediaId } = req.params;
  const isAdmin = req.user.is_admin;
  const userId = req.user.id;

  const filename = await getFilenameById(groupId, albumId, mediaId);

  const filePaths = [
    path.join(uploadConfig.getPath("thumbs"), `${filename}.jpg`),
    path.join(uploadConfig.getPath("display"), `${filename}.jpg`),
    path.join(uploadConfig.getPath("original"), `${filename}.jpg`),
  ];

  const deleteFiles = filePaths.map((filePath) =>
    fs
      .unlink(filePath)
      .then(() => {
        logger.info("Deleted media file", { filePath });
      })
      .catch((error) => {
        if (error.code === "ENOENT") {
          logger.info("Media file was already absent", { filePath });
          return;
        }

        logger.error("Failed to delete media file", { filePath, error });
      }),
  );

  await Promise.all(deleteFiles);

  const result = await deleteMediaById(groupId, albumId, mediaId, isAdmin, userId);

  res.status(200).json(result);
};

// UPDATE MEDIA BY ID
const handleUpdateMediaById = async (req, res) => {
  const { groupId, albumId, mediaId } = req.params;
  const { data } = req.body;
  const isAdmin = req.user.is_admin;
  const userId = req.user.id;

  const result = await updateMediaById(groupId, albumId, mediaId, data, isAdmin, userId);

  res.status(200).json(result);
};

module.exports = {
  handleGetMediaById,
  handleGetMediaByIdWithComments,
  handleDeleteMediaById,
  handleUpdateMediaById,
};
