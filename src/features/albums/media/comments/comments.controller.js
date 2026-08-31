const { logger } = require("../../../../lib/logger");
const {
  broadcastNewComment,
  broadcastCommentUpdated,
  broadcastCommentDeleted,
} = require("../../../../realtime/socket-service");
const { addComment, updateComment, deleteComment } = require("./comments.model");
const { body, validationResult } = require("express-validator");
const { ValidationError } = require("../../../../lib/errors");

const reqValidation = [
  body("content")
    .notEmpty()
    .withMessage("Comment content is required")
    .trim()
    .escape()
    .isLength({ min: 1, max: 1000 })
    .withMessage("Comment content must be between 1 and 1000 characters"),
];

// ADD COMMENT
const handleAddComment = [
  ...reqValidation,

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError("Invalid comment data", errors.array());
    }

    const senderId = req.user.id;
    const { mediaId, albumId } = req.params;
    const { content } = req.body;

    logger.debug("Adding media comment", {
      mediaId,
      senderId,
    });

    const comment = await addComment(mediaId, senderId, content);

    const payload = {
      id: comment.id,
      mediaId: mediaId,
      senderId: senderId,
      content: content,
      createdAt: comment.created_at,
    };

    // WebSocket broadcast
    broadcastNewComment({
      groupId: req.params.groupId,
      mediaId: mediaId,
      payload: payload,
    });

    res.status(201).json(payload);
  },
];

// UPDATE COMMENT
const handleUpdateComment = [
  ...reqValidation,

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError("Invalid updated comment data", errors.array());
    }

    const userId = req.user.id;
    const is_admin = req.groupMembership.is_admin;
    const { mediaId, commentId, albumId } = req.params;
    const { content } = req.body;

    const updatedComment = await updateComment(mediaId, commentId, userId, content, is_admin);

    const payload = {
      id: commentId,
      mediaId: mediaId,
      senderId: updatedComment.sender_id,
      updatedContent: updatedComment.content,
      updatedAt: updatedComment.updated_at,
    };

    // WebSocket broadcast
    broadcastCommentUpdated({
      groupId: req.params.groupId,
      albumId: albumId,
      mediaId: mediaId,
      payload: payload,
    });

    res.status(200).json(payload);
  },
];

// DELETE COMMENT
const handleDeleteComment = async (req, res) => {
  const userId = req.user.id;
  const is_admin = req.groupMembership.is_admin;
  const { mediaId, commentId, albumId } = req.params;

  logger.debug("Deleting media comment", {
    commentId,
    mediaId,
  });

  const deletedComment = await deleteComment(mediaId, commentId, userId, is_admin);

  const payload = {
    id: deletedComment.id,
    mediaId: mediaId,
  };

  // WebSocket broadcast
  broadcastCommentDeleted({
    groupId: req.params.groupId,
    albumId: albumId,
    mediaId: mediaId,
    payload: payload,
  });

  res.status(200).json(payload);
};

module.exports = {
  handleAddComment,
  handleUpdateComment,
  handleDeleteComment,
};
