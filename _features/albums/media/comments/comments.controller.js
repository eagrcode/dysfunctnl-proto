const customConsoleLog = require("../../../../_shared/utils/customConsoleLog");
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

  customConsoleLog("Attempting to add comment with the following data:", {
    mediaId,
    senderId,
    content,
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
  const { updatedContent } = req.body;

  customConsoleLog(`Attempting to update comment with the following data:`, {
    updatedContent,
  });

  const updatedComment = await updateComment(mediaId, commentId, userId, updatedContent, is_admin);

  const payload = {
    id: commentId,
    mediaId: mediaId,
    senderId: updatedComment.sender_id,
    updatedContent: updatedComment.content,
    updatedAt: updatedComment.updated_at,
  };

  // WebSocket broadcast
  broadcastMessageUpdated({
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

// DELETE COMMENT
const handleDeleteComment = async (req, res) => {
  const userId = req.user.id;
  const is_admin = req.groupMembership.is_admin;
  const { mediaId, commentId, albumId } = req.params;

  customConsoleLog(`Attempting to delete comment with the following data:`, {
    commentId,
    mediaId,
  });

  const deletedComment = await deleteComment(mediaId, commentId, userId, is_admin);

  const payload = {
    id: deletedComment.id,
    mediaId: mediaId,
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
