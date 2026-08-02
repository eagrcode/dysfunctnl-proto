const pool = require("../../_shared/utils/db");
const { NotFoundError } = require("../../_shared/utils/errors");

// GET ALL LISTS
const getAllLists = async (groupId, { limit, cursor }) => {
  const values = [groupId, limit + 1];
  let cursorClause = "";

  if (cursor) {
    cursorClause = `AND created_at < $${values.length + 1}`;
    values.push(cursor);
  }

  const result = await pool.query(
    `SELECT * FROM lists
     WHERE group_id = $1
     ${cursorClause}
     ORDER BY created_at DESC
     LIMIT $2`,
    values,
  );

  return result.rows;
};

// CREATE NEW LIST
const createList = async (userId, groupId, listType, title) => {
  const listRes = await pool.query(
    ` INSERT INTO lists
      (created_by, group_id, list_type, title)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
    [userId, groupId, listType, title],
  );

  const listData = listRes.rows[0];

  return listData;
};

// GET LIST BY ID
const getListById = async (groupId, listId) => {
  const result = await pool.query("SELECT * FROM lists WHERE group_id = $1 AND id = $2", [
    groupId,
    listId,
  ]);

  if (result.rows.length === 0) {
    throw new NotFoundError("List not found");
  }

  return result.rows[0];
};

// RENAME LIST
const renameList = async (groupId, listId, newTitle, is_admin, userId) => {
  const result = await pool.query(
    `
      UPDATE lists 
      SET title = $1 
      WHERE group_id = $2 
      AND id = $3
      AND (created_by = $4 OR $5 = true) 
      RETURNING title
    `,
    [newTitle, groupId, listId, userId, is_admin],
  );

  if (result.rows.length === 0) {
    throw new NotFoundError("List not found");
  }

  return result.rows[0];
};

// DELETE A LIST
const deleteList = async (groupId, listId, is_admin, userId) => {
  const result = await pool.query(
    `
      DELETE FROM lists 
      WHERE group_id = $1 
      AND id = $2
      AND (created_by = $3 OR $4 = true) 
      RETURNING *
    `,
    [groupId, listId, userId, is_admin],
  );

  if (result.rows.length === 0) {
    throw new NotFoundError("List not found");
  }

  return result.rows[0];
};

module.exports = {
  getAllLists,
  createList,
  getListById,
  deleteList,
  renameList,
};
