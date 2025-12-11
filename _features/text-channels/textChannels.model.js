const pool = require("../../_shared/utils/db");
const { NotFoundError } = require("../../_shared/utils/errors");

// GET ALL TEXT CHANNELS
const getAllTextChannels = async (groupId) => {
  const result = await pool.query(
    `SELECT * FROM text_channels 
     WHERE group_id = $1 
     ORDER BY created_at DESC`,
    [groupId]
  );

  return result.rows;
};

// CREATE NEW TEXT CHANNEL
const createTextChannel = async (groupId, channelName, createdBy) => {
  const result = await pool.query(
    `INSERT INTO text_channels 
     (group_id, name, created_by) 
     VALUES ($1, $2, $3) 
     RETURNING *`,
    [groupId, channelName, createdBy]
  );

  return result.rows[0];
};

// GET TEXT CHANNEL BY ID
const getTextChannelById = async (groupId, textChannelId) => {
  const result = await pool.query(
    `SELECT * FROM text_channels 
     WHERE group_id = $1 
     AND id = $2`,
    [groupId, textChannelId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError("Text channel not found");
  }

  return result.rows[0];
};

// UPDATE A TEXT CHANNEL
const updateTextChannel = async (groupId, textChannelId, newName) => {
  const result = await pool.query(
    `UPDATE text_channels 
     SET name = $1
     WHERE group_id = $2 
     AND id = $3
     RETURNING *`,
    [newName, groupId, textChannelId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError("Text channel not found or no changes made");
  }

  return result.rows[0];
};

// DELETE A TEXT CHANNEL
const deleteTextChannel = async (groupId, textChannelId) => {
  const result = await pool.query(
    `DELETE FROM text_channels 
     WHERE group_id = $1 
     AND id = $2
     RETURNING *`,
    [groupId, textChannelId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError("Text channel not found");
  }

  return result.rows[0];
};

module.exports = {
  getAllTextChannels,
  createTextChannel,
  getTextChannelById,
  updateTextChannel,
  deleteTextChannel,
};
