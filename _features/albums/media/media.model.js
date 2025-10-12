const pool = require("../../../_shared/utils/db");
const { NotFoundError } = require("../../../_shared/utils/errors");

// ADD NEW MEDIA
const addMedia = async (
  groupId,
  albumId,
  uploadedBy,
  type,
  mimeType,
  url,
  bucketKey,
  sizeBytes,
  filename
) => {
  const { rows } = await pool.query(
    `
    INSERT INTO media (
      album_id,
      group_id,
      uploaded_by,
      type,
      mime_type,  
      url,
      bucket_key,
      size_bytes,
      filename
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *;
  `,
    [albumId, groupId, uploadedBy, type, mimeType, url, bucketKey, sizeBytes, filename]
  );

  if (rows.length === 0) {
    throw new NotFoundError(`Media not added`);
  }

  return rows[0];
};

// GET ALL MEDIA BY ALBUM ID
const getAllMediaByAlbumId = async (groupId, albumId) => {
  const { rows } = await pool.query(
    `
    SELECT *
    FROM media
    WHERE group_id = $1
    AND album_id = $2
    ORDER BY created_at DESC;
  `,
    [groupId, albumId]
  );

  return rows;
};

// GET MEDIA BY ID
const getMediaById = async (groupId, albumId, mediaId) => {
  const { rows } = await pool.query(
    `
    SELECT *
    FROM media
    WHERE group_id = $1
    AND album_id = $2
    AND id = $3;
  `,
    [groupId, albumId, mediaId]
  );

  if (rows.length === 0) {
    throw new NotFoundError(`No media found for ID: ${mediaId}`);
  }

  return rows[0];
};

// DELETE MEDIA BY ID
const deleteMediaById = async (groupId, albumId, mediaId) => {
  const { rows } = await pool.query(
    `
    DELETE FROM media
    WHERE group_id = $1
    AND album_id = $2
    AND id = $3
    RETURNING *;
  `,
    [groupId, albumId, mediaId]
  );

  if (rows.length === 0) {
    throw new NotFoundError(`No media found for ID: ${mediaId}`);
  }

  return rows[0];
};

// UPDATE MEDIA BY ID
const updateMediaById = async (groupId, albumId, mediaId, updates) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  // Dynamic query based on provided updates
  if (updates.filename !== undefined) {
    fields.push(`filename = $${paramIndex++}`);
    values.push(updates.filename);
  }
  if (updates.url !== undefined) {
    fields.push(`url = $${paramIndex++}`);
    values.push(updates.url);
  }
  if (updates.bucketKey !== undefined) {
    fields.push(`bucket_key = $${paramIndex++}`);
    values.push(updates.bucketKey);
  }
  if (updates.newAlbumId !== undefined) {
    const { rows } = await pool.query(
      `SELECT id FROM albums 
       WHERE id = $1 AND group_id = $2`,
      [updates.newAlbumId, groupId]
    );

    if (rows.length === 0) {
      throw new NotFoundError(`No album found for ID: ${updates.newAlbumId}`);
    }

    fields.push(`album_id = $${paramIndex++}`);
    values.push(updates.newAlbumId);
  }

  // Add groupId, albumId and mediaId as the final parameters
  values.push(groupId, albumId, mediaId);

  const query = `
        UPDATE media
        SET ${fields.join(", ")}
        WHERE group_id = $${paramIndex++} AND album_id = $${paramIndex++} AND id = $${paramIndex}
        RETURNING *
      `;

  const result = await pool.query(query, values);

  if (result.rows.length === 0) {
    throw new NotFoundError("Media not found");
  }

  return result.rows[0];
};

module.exports = {
  addMedia,
  getAllMediaByAlbumId,
  getMediaById,
  deleteMediaById,
  updateMediaById,
};
