const {
  getAllTextChannels,
  createTextChannel,
  getTextChannelById,
  updateTextChannel,
  deleteTextChannel,
} = require("./textChannels.model");

// GET ALL TEXT CHANNELS
const handleGetAllTextChannels = async (req, res) => {
  const { groupId } = req.params;

  const result = await getAllTextChannels(groupId);

  res.status(200).json({
    success: true,
    data: result,
  });
};

// CREATE NEW TEXT CHANNEL
const handleCreateTextChannel = async (req, res) => {
  const { groupId } = req.params;
  const { channelName } = req.body;

  const result = await createTextChannel(groupId, channelName);

  res.status(201).json({
    success: true,
    data: result,
  });
};

// GET TEXT CHANNEL BY ID
const handleGetTextChannelById = async (req, res) => {
  const { groupId, textChannelId } = req.params;

  const result = await getTextChannelById(groupId, textChannelId);

  res.status(200).json({
    success: true,
    data: result,
  });
};

// UPDATE TEXT CHANNEL
const handleUpdateTextChannel = async (req, res) => {
  const { groupId, textChannelId } = req.params;
  const { newName } = req.body;

  const result = await updateTextChannel(groupId, textChannelId, newName);

  res.status(201).json({
    success: true,
    data: result,
  });
};

// DELETE TEXT CHANNEL
const handleDeleteTextChannel = async (req, res) => {
  const { groupId, textChannelId } = req.params;

  const result = await deleteTextChannel(groupId, textChannelId);

  res.status(200).json({
    success: true,
    data: result,
  });
};

module.exports = {
  handleGetAllTextChannels,
  handleCreateTextChannel,
  handleGetTextChannelById,
  handleUpdateTextChannel,
  handleDeleteTextChannel,
};
