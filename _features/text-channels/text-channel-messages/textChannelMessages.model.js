const pool = require("../../../_shared/utils/db");
const { NotFoundError } = require("../../../_shared/utils/errors");

// GET ALL MESSAGES
const getAllMessages = async (textChannelId) => {
  const result = await pool.query(
    `SELECT * FROM messages
     WHERE text_channel_id = $1
     ORDER BY created_at DESC`,
    [textChannelId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError("No messages found for this text channel");
  }

  return result.rows;
};

// CREATE NEW MESSAGE
const createMessage = async (textChannelId, content, authorId) => {
  const result = await pool.query(
    `INSERT INTO messages
     (channel_id, content, author_id)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [textChannelId, content, authorId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError("Failed to create message");
  }

  return result.rows[0];
};

// UPDATE MESSAGE
const updateMessage = async (textChannelId, messageId, newContent) => {
  const result = await pool.query(
    `UPDATE messages
     SET content = $1
     WHERE text_channel_id = $2
     AND id = $3
     RETURNING *`,
    [newContent, textChannelId, messageId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError("Message not found or failed to update");
  }

  return result.rows[0];
};

// DELETE MESSAGE
const deleteMessage = async (textChannelId, messageId) => {
  const result = await pool.query(
    `DELETE FROM messages
     WHERE text_channel_id = $1
     AND id = $2
     RETURNING *`,
    [textChannelId, messageId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError("Message not found or failed to delete");
  }

  return result.rows[0];
};

module.exports = {
  getAllMessages,
  createMessage,
  updateMessage,
  deleteMessage,
};
