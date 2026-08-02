const pool = require("../../../_shared/utils/db");
const { NotFoundError } = require("../../../_shared/utils/errors");

// GET ALL LIST ITEMS
const getListItems = async (listId) => {
  const result = await pool.query(
    "SELECT * FROM list_items WHERE list_id = $1 ORDER BY created_at DESC",
    [listId],
  );

  return result.rows;
};

// CREATE NEW LIST ITEM
const createListItem = async (groupId, listId, content, is_admin, userId) => {
  const result = await pool.query(
    `
      INSERT INTO list_items (list_id, content)
      SELECT l.id, $3
      FROM lists l
      WHERE l.group_id = $1
      AND l.id = $2
      AND (l.created_by = $4 OR l.assigned_to = $4 OR $5 = true)
      RETURNING *
    `,
    [groupId, listId, content, userId, is_admin],
  );

  if (result.rows.length === 0) {
    throw new NotFoundError("Failed to create list item");
  }

  return result.rows[0];
};

// GET LIST ITEM BY ID
const getListItemById = async (groupId, listId, itemId) => {
  const result = await pool.query(
    `
      SELECT li.* FROM list_items li
      JOIN lists l ON li.list_id = l.id
      WHERE l.group_id = $1
      AND li.list_id = $2
      AND li.id = $3
    `,
    [groupId, listId, itemId],
  );

  if (result.rows.length === 0) {
    throw new NotFoundError("List item not found");
  }

  return result.rows[0];
};

// UPDATE A LIST ITEM
const updateListItem = async (groupId, listId, itemId, content, is_admin, userId) => {
  const result = await pool.query(
    `
      UPDATE list_items li
      SET content = $1
      FROM lists l
      WHERE li.list_id = l.id
      AND l.group_id = $6
      AND li.list_id = $2
      AND li.id = $3
      AND (l.created_by = $4 OR l.assigned_to = $4 OR $5 = true)
      RETURNING li.list_id, li.id, li.content
    `,
    [content, listId, itemId, userId, is_admin, groupId],
  );

  if (result.rows.length === 0) {
    throw new NotFoundError("Failed to update list item");
  }

  return result.rows[0];
};

// TOGGLE COMPLETE STATUS OF A LIST ITEM
const toggleComplete = async (groupId, listId, itemId, bool, is_admin, userId) => {
  const result = await pool.query(
    `
      UPDATE list_items li
      SET completed = $1
      FROM lists l
      WHERE li.list_id = l.id
      AND l.group_id = $6
      AND li.list_id = $2
      AND li.id = $3
      AND (l.created_by = $4 OR l.assigned_to = $4 OR $5 = true)
      RETURNING li.list_id, li.id, li.completed, li.updated_at
    `,
    [bool, listId, itemId, userId, is_admin, groupId],
  );

  if (result.rows.length === 0) {
    throw new NotFoundError("Failed to toggle completed status");
  }

  return result.rows[0];
};

// TOGGLE COMPLETE STATUS OF ALL LIST ITEMS
const toggleCompleteAll = async (groupId, listId, bool, is_admin, userId) => {
  const result = await pool.query(
    `
      UPDATE list_items li
      SET completed = $1
      FROM lists l
      WHERE li.list_id = l.id
      AND l.group_id = $5
      AND li.list_id = $2
      AND (l.created_by = $3 OR l.assigned_to = $3 OR $4 = true)
      RETURNING li.list_id, li.id
    `,
    [bool, listId, userId, is_admin, groupId],
  );

  if (result.rowCount === 0) {
    throw new NotFoundError("Failed to toggle completed status");
  }

  return {
    list_id: listId,
    completed: bool,
    updatedItemCount: result.rowCount,
  };
};

// DELETE LIST ITEMS
const deleteListItems = async (groupId, listId, itemIds, is_admin, userId) => {
  const result = await pool.query(
    `
      DELETE FROM list_items li
      USING lists l
      WHERE li.list_id = l.id
      AND l.group_id = $5
      AND li.list_id = $1
      AND li.id = ANY($2)
      AND (l.created_by = $3 OR l.assigned_to = $3 OR $4 = true)
      RETURNING li.list_id, li.id
    `,
    [listId, itemIds, userId, is_admin, groupId],
  );

  if (result.rowCount === 0) {
    throw new NotFoundError("Failed to delete list item");
  }

  return {
    list_id: listId,
    deletedItemIds: result.rows.map((row) => row.id),
    deletedCount: result.rowCount,
  };
};

module.exports = {
  getListItems,
  createListItem,
  getListItemById,
  updateListItem,
  toggleComplete,
  toggleCompleteAll,
  deleteListItems,
};
