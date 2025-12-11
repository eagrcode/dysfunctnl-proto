const pool = require("../../../_shared/utils/db");
const { NotFoundError, FailedActionError } = require("../../../_shared/utils/errors");

const path = require("path");

// GET ALL MESSAGES
const getAllMessages = async (textChannelId) => {
  const result = await pool.query(
    `SELECT * FROM text_channel_messages
     WHERE channel_id = $1
     ORDER BY created_at DESC`,
    [textChannelId]
  );

  return result.rows;
};

// CREATE NEW MESSAGE
const createMessage = async (textChannelId, content, authorId) => {
  const result = await pool.query(
    `INSERT INTO text_channel_messages
     (channel_id, content, sender_id)
     VALUES ($1, $2, $3)
     RETURNING id, created_at`,
    [textChannelId, content, authorId]
  );

  return result.rows[0];
};

// UPDATE MESSAGE
const updateMessage = async (textChannelId, messageId, newContent, userId, is_admin) => {
  const result = await pool.query(
    `UPDATE text_channel_messages
     SET content = $1
     WHERE channel_id = $2
     AND id = $3
     AND (sender_id = $4 OR $5 = TRUE)
     RETURNING content, updated_at, sender_id`,
    [newContent, textChannelId, messageId, userId, is_admin]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError("Failed to update message");
  }

  return result.rows[0];
};

// DELETE MESSAGE
const deleteMessage = async (textChannelId, messageId, userId, is_admin) => {
  const result = await pool.query(
    `UPDATE text_channel_messages
     SET deleted_at = NOW()
     WHERE channel_id = $1
     AND id = $2
     AND (sender_id = $3 OR $4 = TRUE)
     RETURNING id, deleted_at, sender_id`,
    [textChannelId, messageId, userId, is_admin]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError("Failed to update message");
  }

  return result.rows[0];
};

module.exports = {
  getAllMessages,
  createMessage,
  updateMessage,
  deleteMessage,
};
