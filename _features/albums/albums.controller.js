const {
  addAlbum,
  getAllAlbumsByGroupId,
  getAlbumById,
  getAlbumByIdWithMedia,
  deleteAlbumById,
  updateAlbumById,
} = require("./albums.model");

// ADD NEW ALBUM
const handleAddAlbum = async (req, res) => {
  const { groupId } = req.params;
  const { name, description } = req.body;
  const userId = req.user.id;

  const result = await addAlbum(groupId, name, description, userId);

  res.status(201).json({
    success: true,
    data: result,
  });
};

// GET ALL ALBUMS BY GROUP ID
const handleGetAllAlbumsByGroupId = async (req, res) => {
  const { groupId } = req.params;

  const albums = await getAllAlbumsByGroupId(groupId);

  res.status(200).json({
    success: true,
    data: albums,
  });
};

// GET ALBUM BY ID
const handleGetAlbumById = async (req, res) => {
  const { groupId, albumId } = req.params;

  const album = await getAlbumById(groupId, albumId);

  res.status(200).json({
    success: true,
    data: album,
  });
};

// GET ALBUM BY ID WITH MEDIA
const handleGetAlbumByIdWithMedia = async (req, res) => {
  const { groupId, albumId } = req.params;

  const album = await getAlbumByIdWithMedia(groupId, albumId);

  res.status(200).json({
    success: true,
    data: album,
  });
};

// DELETE ALBUM BY ID
const handleDeleteAlbumById = async (req, res) => {
  const { groupId, albumId } = req.params;
  const { is_admin } = req.groupMembership;
  const userId = req.user.id;

  const result = await deleteAlbumById(groupId, albumId, is_admin, userId);

  res.status(200).json({
    success: true,
    data: result,
  });
};

// UPDATE ALBUM BY ID
const handleUpdateAlbumById = async (req, res) => {
  const { groupId, albumId } = req.params;
  const { name, description } = req.body;
  const { is_admin } = req.groupMembership;
  const userId = req.user.id;

  const result = await updateAlbumById(groupId, albumId, name, description, is_admin, userId);

  res.status(201).json({
    success: true,
    data: result,
  });
};

module.exports = {
  handleAddAlbum,
  handleGetAllAlbumsByGroupId,
  handleGetAlbumById,
  handleGetAlbumByIdWithMedia,
  handleDeleteAlbumById,
  handleUpdateAlbumById,
};
