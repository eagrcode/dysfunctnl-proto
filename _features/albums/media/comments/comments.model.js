const pool = require("../../../../_shared/utils/db");
const { FailedActionError } = require("../../../../_shared/utils/errors");

// ADD COMMENT
const addComment = async (mediaId, senderId, content) => {
  const { rows } = await pool.query(
    `
     INSERT INTO media_comments (
     media_id,
     sender_id, 
     content
     ) 
     VALUES ($1, $2, $3)
     RETURNING *;
    `,
    [mediaId, senderId, content]
  );

  if (rows.length === 0) {
    throw new FailedActionError("Failed to add comment", {
      condition1: "Media not found",
      condition2: "Permission denied",
    });
  }

  return rows[0];
};

const updateComment = async (mediaId, commentId, senderId, newContent, is_admin) => {
  const result = await pool.query(
    `
     UPDATE media_comments
     SET content = $1
     WHERE media_id = $2
     AND id = $3
     AND (sender_id = $4 OR $5 = TRUE)
     RETURNING content, updated_at, sender_id
    `,
    [newContent, mediaId, commentId, senderId, is_admin]
  );

  if (result.rows.length === 0) {
    throw new FailedActionError("Failed to update comment", {
      condition1: "Comment not found",
      condition2: "Permission denied",
    });
  }

  return result.rows[0];
};

const deleteComment = async (mediaId, commentId, senderId, is_admin) => {
  const result = await pool.query(
    `
        DELETE FROM media_comments
        WHERE media_id = $1
        AND id = $2
        AND (sender_id = $3 OR $4 = TRUE)
        RETURNING id, sender_id
      `,
    [mediaId, commentId, senderId, is_admin]
  );

  if (result.rows.length === 0) {
    throw new FailedActionError("Failed to delete comment", {
      condition1: "Comment not found",
      condition2: "Permission denied",
    });
  }

  return result.rows[0];
};

module.exports = {
  addComment,
  updateComment,
  deleteComment,
};
