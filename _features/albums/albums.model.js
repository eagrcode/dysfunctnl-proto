const pool = require("../../_shared/utils/db");
const { NotFoundError } = require("../../_shared/utils/errors");
const withTransaction = require("../../_shared/utils/queryTransaction");

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
  return withTransaction(async (client) => {
    const albumResult = await client.query(
      `
    SELECT *
    FROM media_albums
    WHERE group_id = $1
    AND id = $2;
  `,
      [groupId, albumId]
    );

    const albumData = albumResult.rows[0];

    if (!albumData) {
      throw new NotFoundError(`Album with ID ${albumId} not found`);
    }

    const mediaResult = await client.query(
      `
        SELECT *
        FROM media
        WHERE group_id = $1
        AND album_id = $2
        ORDER BY created_at DESC;
      `,
      [groupId, albumId]
    );

    albumData.media = mediaResult.rows;

    return albumData;
  });

  // const { rows } = await pool.query(
  //   `
  //   SELECT *
  //   FROM media_albums
  //   WHERE group_id = $1
  //   AND id = $2;
  // `,
  //   [groupId, albumId]
  // );

  // if (rows.length === 0) {
  //   throw new NotFoundError(`Album with ID ${albumId} not found`);
  // }

  // return rows[0];
};

// DELETE ALBUM BY ID
const deleteAlbumById = async (groupId, albumId, is_admin, userId) => {
  const { rows } = await pool.query(
    `
    DELETE FROM media_albums    
    WHERE group_id = $1
    AND id = $2
    AND (created_by = $3 OR $4 = true)
    RETURNING *;
  `,
    [groupId, albumId, userId, is_admin]
  );

  if (rows.length === 0) {
    throw new NotFoundError(`Failed to delete album with ID ${albumId}`, {
      consition1: "Album not found",
      condition2: "Permission denied",
    });
  }

  return rows[0];
};

// UPDATE ALBUM BY ID
const updateAlbumById = async (groupId, albumId, name, description, is_admin, userId) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  // Dynamic query based on provided updates
  if (name !== undefined) {
    fields.push(`name = $${paramIndex}`);
    values.push(name);
    paramIndex++;
  }
  if (description !== undefined) {
    fields.push(`description = $${paramIndex}`);
    values.push(description);
    paramIndex++;
  }

  // Add final parameters for WHERE clause
  values.push(groupId, albumId, userId, is_admin);

  const query = `
    UPDATE media_albums
    SET ${fields.join(", ")}
    WHERE group_id = $${paramIndex++} 
    AND id = $${paramIndex++}
    AND (created_by = $${paramIndex++} OR $${paramIndex} = true) 
    RETURNING *;
  `;

  console.log("Update Album Query:", query);
  console.log("With Values:", values);

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
