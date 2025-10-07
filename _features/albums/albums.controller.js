const {
  addAlbum,
  getAllAlbumsByGroupId,
  getAlbumById,
  deleteAlbumById,
  updateAlbumById,
} = require("./albums.model");
const { getAllMediaByAlbumId } = require("../media/media.model");

// ADD NEW ALBUM
const handleAddAlbum = async (req, res) => {
  const { groupId } = req.params;
  const { name, description, createdBy } = req.body.data;

  const result = await addAlbum(groupId, name, description, createdBy);

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
  const media = await getAllMediaByAlbumId(groupId, albumId);

  album.media = media;

  res.status(200).json({
    success: true,
    data: album,
  });
};

// DELETE ALBUM BY ID
const handleDeleteAlbumById = async (req, res) => {
  const { groupId, albumId } = req.params;

  const result = await deleteAlbumById(groupId, albumId);

  res.status(200).json({
    success: true,
    data: result,
  });
};

// UPDATE ALBUM BY ID
const handleUpdateAlbumById = async (req, res) => {
  const { groupId, albumId } = req.params;
  const { data } = req.body;

  const result = await updateAlbumById(groupId, albumId, data);

  res.status(201).json({
    success: true,
    data: result,
  });
};

module.exports = {
  handleAddAlbum,
  handleGetAllAlbumsByGroupId,
  handleGetAlbumById,
  handleDeleteAlbumById,
  handleUpdateAlbumById,
};
