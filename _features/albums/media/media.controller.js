const fs = require("fs").promises;
const path = require("path");
const uploadConfig = require("../../../_shared/utils/uploadConfig");
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

  res.status(200).json({
    success: true,
    data: media,
  });
};

// GET MEDIA BY ID
const handleGetMediaByIdWithComments = async (req, res) => {
  const { groupId, albumId, mediaId } = req.params;

  const media = await getMediaByIdWithComments(groupId, albumId, mediaId);

  res.status(200).json({
    success: true,
    data: media,
  });
};

// DELETE MEDIA BY ID
const handleDeleteMediaById = async (req, res) => {
  const { groupId, albumId, mediaId } = req.params;

  const filename = await getFilenameById(groupId, albumId, mediaId);

  const filePaths = [
    path.join(uploadConfig.getPath("thumbs"), `${filename}.jpg`),
    path.join(uploadConfig.getPath("display"), `${filename}.jpg`),
    path.join(uploadConfig.getPath("original"), `${filename}.jpg`),
  ];

  const deleteFiles = filePaths.map((filePath) =>
    fs.unlink(filePath).catch((error) => {
      if (error.code !== "ENOENT") {
        console.error(`Error deleting file at ${filePath}:`, error);
      }

      console.log(`Successfully deleted file at ${filePath}, or file did not exist.`);
    })
  );

  await Promise.all(deleteFiles);

  const result = await deleteMediaById(groupId, albumId, mediaId);

  res.status(200).json({
    success: true,
    data: result,
  });
};

// UPDATE MEDIA BY ID
const handleUpdateMediaById = async (req, res) => {
  const { groupId, albumId, mediaId } = req.params;
  const { data } = req.body;

  const result = await updateMediaById(groupId, albumId, mediaId, data);

  res.status(201).json({
    success: true,
    data: result,
  });
};

module.exports = {
  handleGetMediaById,
  handleGetMediaByIdWithComments,
  handleDeleteMediaById,
  handleUpdateMediaById,
};
