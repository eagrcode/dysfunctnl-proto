const pool = require("../../../_shared/utils/db");
const { NotFoundError } = require("../../../_shared/utils/errors");
const withTransaction = require("../../../_shared/utils/queryTransaction");

// ADD NEW MEDIA
const addMedia = async (
  groupId,
  albumId,
  uploadedBy,
  type,
  mimeType,
  // url,
  // bucketKey,
  sizeBytes,
  filename
) => {
  console.log("ADDING MEDIA:", {
    groupId,
    albumId,
    uploadedBy,
    type,
    mimeType,
    sizeBytes,
    filename,
  });

  const { rows } = await pool.query(
    `
    INSERT INTO media (
      album_id,
      group_id,
      uploaded_by,
      type,
      mime_type,  
      size_bytes,
      filename
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `,
    [albumId, groupId, uploadedBy, type, mimeType, sizeBytes, filename]
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
  if (fields.length === 0 && updates.newAlbumId === undefined) {
    throw new Error("No updates provided");
  }
  if (updates.newAlbumId !== undefined) {
    return await withTransaction(async (client) => {
      const { rows: albumRows } = await client.query(
        `SELECT id FROM albums 
         WHERE id = $1 AND group_id = $2 FOR UPDATE`,
        [updates.newAlbumId, groupId]
      );

      if (albumRows.length === 0) {
        throw new NotFoundError(`No album found for ID: ${updates.newAlbumId}`);
      }

      fields.push(`album_id = $${paramIndex++}`);
      values.push(updates.newAlbumId);

      const updateQuery = `UPDATE media 
                           SET ${fields.join(", ")} 
                           WHERE id = $${paramIndex++} AND album_id = $${paramIndex++} 
                           RETURNING *`;

      values.push(mediaId, albumId);

      const { rows } = await client.query(updateQuery, values);

      if (rows.length === 0) {
        throw new NotFoundError(`No media found for ID: ${mediaId} in album ${albumId}`);
      }

      return rows[0];
    });
  } else {
    const updateQuery = `UPDATE media 
                         SET ${fields.join(", ")} 
                         WHERE id = $${paramIndex++} AND album_id = $${paramIndex++} 
                         RETURNING *`;

    values.push(mediaId, albumId);

    const { rows } = await pool.query(updateQuery, values);

    if (rows.length === 0) {
      throw new NotFoundError(`No media found for ID: ${mediaId} in album ${albumId}`);
    }

    return rows[0];
  }
};

module.exports = {
  addMedia,
  getAllMediaByAlbumId,
  getMediaById,
  deleteMediaById,
  updateMediaById,
};
