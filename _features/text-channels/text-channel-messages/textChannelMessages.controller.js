const {
  getAllMessages,
  createMessage,
  deleteMessage,
  updateMessage,
} = require("./textChannelMessages.model");
const {
  broadcastNewMessage,
  broadcastMessageUpdated,
  broadcastMessageDeleted,
} = require("../../../_shared/utils/socketService");

const path = require("path");

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
  const { textChannelId, groupId } = req.params;
  const { content } = req.body;

  console.log(
    `/${path.basename(__filename)} - Attempting to create message with the following data:`,
    {
      authorId,
      textChannelId,
      content,
    }
  );

  const message = await createMessage(textChannelId, content, authorId);

  const payload = {
    id: message.id,
    authorId: authorId,
    textChannelId: textChannelId,
    content: content,
    createdAt: message.created_at,
  };

  // WebSocket broadcast
  broadcastNewMessage({
    groupId: groupId,
    textChannelId: textChannelId,
    payload: payload,
  });

  res.status(201).json({
    success: true,
    data: payload,
  });
};

// DELETE MESSAGE
const handleDeleteMessage = async (req, res) => {
  const { textChannelId, messageId, groupId } = req.params;
  const { is_admin } = req.groupMembership;
  const userId = req.user.id;

  console.log(
    `/${path.basename(__filename)} - Attempting to delte message with the following data:`,
    {
      userId,
      textChannelId,
      messageId,
    }
  );

  const deletedMessage = await deleteMessage(textChannelId, messageId, userId, is_admin);

  const payload = {
    id: messageId,
    authorId: deletedMessage.sender_id,
    textChannelId: textChannelId,
    deletedAt: deletedMessage.deleted_at,
  };

  // WebSocket broadcast
  broadcastMessageDeleted({
    groupId: groupId,
    textChannelId: textChannelId,
    payload: payload,
  });

  res.status(200).json({
    success: true,
    data: payload,
  });
};

// UPDATE MESSAGE
const handleUpdateMessage = async (req, res) => {
  const { textChannelId, messageId, groupId } = req.params;
  const { newContent } = req.body;
  const { is_admin } = req.groupMembership;
  const userId = req.user.id;

  console.log(
    `/${path.basename(__filename)} - Attempting to update message with the following data:`,
    {
      userId,
      textChannelId,
      messageId,
      newContent,
    }
  );

  const updatedMessage = await updateMessage(
    textChannelId,
    messageId,
    newContent,
    userId,
    is_admin
  );

  const payload = {
    id: messageId,
    authorId: updatedMessage.sender_id,
    textChannelId: textChannelId,
    content: newContent,
    updatedAt: updatedMessage.updated_at,
  };

  // WebSocket broadcast
  broadcastMessageUpdated({
    groupId: groupId,
    textChannelId: textChannelId,
    payload: payload,
  });

  res.status(201).json({
    success: true,
    data: payload,
  });
};

module.exports = {
  handleGetAllMessages,
  handleCreateMessage,
  handleDeleteMessage,
  handleUpdateMessage,
};
