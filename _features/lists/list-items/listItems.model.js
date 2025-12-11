const pool = require("../../../_shared/utils/db");
const {
  NotFoundError,
  ForbiddenError,
  FailedActionError,
} = require("../../../_shared/utils/errors");

// GET ALL LIST ITEMS
const getListItems = async (listId) => {
  const result = await pool.query(
    "SELECT * FROM list_items WHERE list_id = $1 ORDER BY created_at DESC",
    [listId]
  );

  return result.rows;
};

// CREATE NEW LIST ITEM
const createListItem = async (listId, content, is_admin, userId) => {
  const result = await pool.query(
    `
       INSERT INTO list_items (list_id, content)
       SELECT $1, $2
       FROM lists
       WHERE id = $1
       AND (created_by = $3 OR assigned_to = $3 OR $4 = true)
       RETURNING *
    `,
    [listId, content, userId, is_admin]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError("Failed to create list item");
  }

  return result.rows[0];
};

// GET LIST ITEM BY ID
const getListItemById = async (listId, itemId) => {
  const result = await pool.query("SELECT * FROM list_items WHERE list_id = $1 AND id = $2", [
    listId,
    itemId,
  ]);

  if (result.rows.length === 0) {
    throw new NotFoundError("List item not found");
  }

  return result.rows[0];
};

// UPDATE A LIST ITEM
const updateListItem = async (listId, itemId, content, is_admin, userId) => {
  const result = await pool.query(
    `
      UPDATE list_items li
      SET content = $1
      FROM lists l
      WHERE li.list_id = l.id
      AND li.list_id = $2
      AND li.id = $3
      AND (l.created_by = $4 OR l.assigned_to = $4 OR $5 = true)
      RETURNING li.id, li.content
    `,
    [content, listId, itemId, userId, is_admin]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError("Failed to update list item");
  }

  return result.rows[0];
};

// TOGGLE COMPLETE STATUS OF A LIST ITEM
const toggleComplete = async (listId, itemId, bool, is_admin, userId) => {
  const result = await pool.query(
    `
      UPDATE list_items li
      SET completed = $1
      FROM lists l
      WHERE li.list_id = l.id
      AND li.list_id = $2
      AND li.id = $3
      AND (l.created_by = $4 OR l.assigned_to = $4 OR $5 = true)
      RETURNING li.id, li.completed
    `,
    [bool, listId, itemId, userId, is_admin]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError("Failed to toggle completed status");
  }

  return result.rows[0];
};

// DELETE A LIST ITEM
const deleteListItem = async (listId, itemId, is_admin, userId) => {
  const result = await pool.query(
    `
      DELETE FROM list_items li
      USING lists l
      WHERE li.list_id = l.id
      AND li.list_id = $1
      AND li.id = $2
      AND (l.created_by = $3 OR l.assigned_to = $3 OR $4 = true)
      RETURNING li.id
    `,
    [listId, itemId, userId, is_admin]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError("Failed to create list item");
  }

  return result.rows[0];
};

module.exports = {
  getListItems,
  createListItem,
  getListItemById,
  updateListItem,
  toggleComplete,
  deleteListItem,
};
