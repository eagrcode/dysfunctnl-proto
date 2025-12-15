const {
  getAllTextChannels,
  createTextChannel,
  getTextChannelById,
  updateTextChannel,
  deleteTextChannel,
} = require("./textChannels.model");
const { body, validationResult } = require("express-validator");
const { ValidationError } = require("../../_shared/utils/errors");

const validationAssertions = [
  body("channelName")
    .notEmpty()
    .withMessage("Channel name is required")
    .trim()
    .escape()
    .isLength({ min: 1, max: 100 })
    .withMessage("Channel name must be between 1 and 100 characters"),
];

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
const handleCreateTextChannel = [
  ...validationAssertions,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError("Invalid text channel data", errors.array());
    }

    const { groupId } = req.params;
    const { channelName } = req.body;
    const userId = req.user.id;

    const result = await createTextChannel(groupId, channelName, userId);

    res.status(201).json({
      success: true,
      data: result,
    });
  },
];

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
const handleUpdateTextChannel = [
  ...validationAssertions,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError("Invalid text channel data", errors.array());
    }

    const { groupId, textChannelId } = req.params;
    const { channelName } = req.body;

    const result = await updateTextChannel(groupId, textChannelId, channelName);

    res.status(200).json({
      success: true,
      data: result,
    });
  },
];

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
