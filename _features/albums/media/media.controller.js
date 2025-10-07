const {
  addMedia,
  getAllMediaByAlbumId,
  getMediaById,
  deleteMediaById,
  updateMediaById,
} = require("../media.model");

// ADD MEDIA
const handleAddMedia = async (req, res, next) => {
  const { groupId, albumId } = req.params;

  const { uploadedBy, type, mimeType, url, bucketKey, sizeBytes, filename } = req.body.data;

  const result = await addMedia(
    groupId,
    albumId,
    uploadedBy,
    type,
    mimeType,
    url,
    bucketKey,
    sizeBytes,
    filename
  );

  res.status(201).json({
    success: true,
    data: result,
  });
};

// GET MEDIA BY ID
const handleGetMediaById = async (req, res) => {
  const { groupId, albumId, mediaId } = req.params;

  const result = await getMediaById(groupId, albumId, mediaId);

  res.status(200).json({
    success: true,
    data: result,
  });
};

// DELETE MEDIA BY ID
const handleDeleteMediaById = async (req, res) => {
  const { groupId, albumId, mediaId } = req.params;

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
  handleAddMedia,
  handleGetMediaById,
  handleDeleteMediaById,
  handleUpdateMediaById,
};
