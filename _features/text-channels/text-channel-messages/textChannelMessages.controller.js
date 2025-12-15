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
const { body, validationResult } = require("express-validator");
const { ValidationError } = require("../../_shared/utils/errors");

const validationAssertions = [
  body("content")
    .notEmpty()
    .withMessage("Message content is required")
    .trim()
    .escape()
    .isLength({ min: 1, max: 2000 })
    .withMessage("Message content must be between 1 and 2000 characters"),
];

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
const handleCreateMessage = [
  ...validationAssertions,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError("Invalid message data", errors.array());
    }

    const authorId = req.user.id;
    const { textChannelId, groupId } = req.params;
    const { content } = req.body;

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
  },
];

// DELETE MESSAGE
const handleDeleteMessage = async (req, res) => {
  const { textChannelId, messageId, groupId } = req.params;
  const { is_admin } = req.groupMembership;
  const userId = req.user.id;

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
const handleUpdateMessage = [
  ...validationAssertions,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError("Invalid message data", errors.array());
    }

    const { textChannelId, messageId, groupId } = req.params;
    const { content } = req.body;
    const { is_admin } = req.groupMembership;
    const userId = req.user.id;

    const updatedMessage = await updateMessage(textChannelId, messageId, content, userId, is_admin);

    const payload = {
      id: messageId,
      authorId: updatedMessage.sender_id,
      textChannelId: textChannelId,
      content: content,
      updatedAt: updatedMessage.updated_at,
    };

    // WebSocket broadcast
    broadcastMessageUpdated({
      groupId: groupId,
      textChannelId: textChannelId,
      payload: payload,
    });

    res.status(200).json({
      success: true,
      data: payload,
    });
  },
];

module.exports = {
  handleGetAllMessages,
  handleCreateMessage,
  handleDeleteMessage,
  handleUpdateMessage,
};
