const pool = require("../../_shared/utils/db");
const { NotFoundError } = require("../../_shared/utils/errors");

// ADD NEW ALBUM
const addAlbum = async (groupId, name, description, createdBy) => {
  const { rows } = await pool.query(
    `
    INSERT INTO media_albums (
      group_id,
      name,
      description,
      created_by
    ) VALUES ($1, $2, $3, $4)
    RETURNING *;
  `,
    [groupId, name, description, createdBy]
  );

  if (rows.length === 0) {
    throw new NotFoundError(`Album not added`);
  }

  return rows[0];
};

// GET ALL ALBUMS BY GROUP ID
const getAllAlbumsByGroupId = async (groupId) => {
  const { rows } = await pool.query(
    `
    SELECT *
    FROM media_albums
    WHERE group_id = $1
    ORDER BY created_at DESC;
  `,
    [groupId]
  );

  return rows;
};

// GET ALBUM BY ID
const getAlbumById = async (groupId, albumId) => {
  const { rows } = await pool.query(
    `
    SELECT *
    FROM media_albums
    WHERE group_id = $1
    AND id = $2;
  `,
    [groupId, albumId]
  );

  if (rows.length === 0) {
    throw new NotFoundError(`Album with ID ${albumId} not found`);
  }

  return rows[0];
};

// DELETE ALBUM BY ID
const deleteAlbumById = async (groupId, albumId) => {
  const { rows } = await pool.query(
    `
    DELETE FROM media_albums    
    WHERE group_id = $1
    AND id = $2 
    RETURNING *;
  `,
    [groupId, albumId]
  );

  if (rows.length === 0) {
    throw new NotFoundError(`Album with ID ${albumId} not found`);
  }

  return rows[0];
};

// UPDATE ALBUM BY ID
const updateAlbumById = async (groupId, albumId, data) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  // Dynamic query based on provided updates
  if (data.name !== undefined) {
    fields.push(`name = $${paramIndex}`);
    values.push(data.name);
    paramIndex++;
  }
  if (data.description !== undefined) {
    fields.push(`description = $${paramIndex}`);
    values.push(data.description);
    paramIndex++;
  }

  // Add groupId and albumId as the final parameters
  values.push(groupId, albumId);

  const query = `
    UPDATE media_albums
    SET ${fields.join(", ")}
    WHERE group_id = $${paramIndex++} AND id = $${paramIndex}
    RETURNING *;
  `;

  const { rows } = await pool.query(query, values);

  if (rows.length === 0) {
    throw new NotFoundError(`Album with ID ${albumId} not found`);
  }

  return rows[0];
};

module.exports = {
  addAlbum,
  getAllAlbumsByGroupId,
  getAlbumById,
  deleteAlbumById,
  updateAlbumById,
};
