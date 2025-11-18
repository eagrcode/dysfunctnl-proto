const {
  getAllMessages,
  createMessage,
  deleteMessage,
  updateMessage,
} = require("./textChannelMessages.model");

// GET ALL MESSAGES
const handleGetAllMessages = async (req, res) => {
  const { textChannelId } = req.params;

  const result = await getAllMessages(textChannelId);

  res.status(200).json({
    success: true,
    data: result,
  });
};

// CREATE NEW MESSAGE
const handleCreateMessage = async (req, res) => {
  const authorId = req.user.id;
  const { textChannelId } = req.params;
  const { content } = req.body;

  const result = await createMessage(textChannelId, content, authorId);

  res.status(201).json({
    success: true,
    data: result,
  });
};

// DELETE MESSAGE
const handleDeleteMessage = async (req, res) => {
  const { textChannelId, messageId } = req.params;
  const { is_admin } = req.groupMembership;
  const userId = req.user.id;

  const result = await deleteMessage(textChannelId, messageId, userId, is_admin);

  res.status(200).json({
    success: true,
    data: result,
  });
};

// UPDATE MESSAGE
const handleUpdateMessage = async (req, res) => {
  const { textChannelId, messageId } = req.params;
  const { newContent } = req.body;

  const result = await updateMessage(textChannelId, messageId, newContent);

  res.status(201).json({
    success: true,
    data: result,
  });
};

module.exports = {
  handleGetAllMessages,
  handleCreateMessage,
  handleDeleteMessage,
  handleUpdateMessage,
};
