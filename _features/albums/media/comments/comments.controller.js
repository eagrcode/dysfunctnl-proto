const path = require("path");
const {
  broadcastNewComment,
  broadcastMessageUpdated,
  broadcastMessageDeleted,
} = require("../../../../_shared/utils/socketService");
const { addComment, updateComment, deleteComment } = require("./comments.model");

// ADD COMMENT
const handleAddComment = async (req, res) => {
  const senderId = req.user.id;
  const { mediaId, albumId } = req.params;
  const { content } = req.body;

  console.log(
    `/${path.basename(__filename)} - Attempting to add comment with the following data:`,
    {
      senderId,
      mediaId,
      content,
    }
  );

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
    albumId: albumId,
    mediaId: mediaId,
    payload: payload,
  });

  res.status(201).json({
    success: true,
    data: payload,
  });
};

// UPDATE COMMENT
const handleUpdateComment = async (req, res) => {
  const userId = req.user.id;
  const is_admin = req.groupMembership.is_admin;
  const { mediaId, commentId, albumId } = req.params;
  const { newContent } = req.body;

  console.log(
    `/${path.basename(__filename)} - Attempting to update comment with the following data:`,
    {
      newContent,
    }
  );

  const updatedComment = await updateComment(mediaId, commentId, userId, newContent, is_admin);

  const payload = {
    id: commentId,
    mediaId: mediaId,
    senderId: updatedComment.sender_id,
    newContent: updatedComment.content,
    updatedAt: updatedComment.updated_at,
  };

  // WebSocket broadcast
  broadcastMessageUpdated({
    groupId: req.params.groupId,
    albumId: albumId,
    mediaId: mediaId,
    payload: payload,
  });

  res.status(201).json({
    success: true,
    data: payload,
  });
};

// DELETE COMMENT
const handleDeleteComment = async (req, res) => {
  const userId = req.user.id;
  const is_admin = req.groupMembership.is_admin;
  const { mediaId, commentId, albumId } = req.params;

  console.log(
    `/${path.basename(__filename)} - Attempting to delete comment with the following data:`,
    {
      commentId,
      senderId,
      mediaId,
    }
  );

  const deletedComment = await deleteComment(mediaId, commentId, userId, is_admin);

  const payload = {
    id: deletedComment.id,
    mediaId: mediaId,
    senderId: deletedComment.sender_id,
  };

  // WebSocket broadcast
  broadcastMessageDeleted({
    groupId: req.params.groupId,
    albumId: albumId,
    mediaId: mediaId,
    payload: payload,
  });

  res.status(200).json({
    success: true,
    data: payload,
  });
};

module.exports = {
  handleAddComment,
  handleUpdateComment,
  handleDeleteComment,
};
