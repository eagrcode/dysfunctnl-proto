const pool = require("../db");
const { NotFoundError } = require("../utils/errors");

// GET ALL LIST ITEMS
const getListItems = async (listId) => {
  const result = await pool.query(
    "SELECT * FROM list_items WHERE list_id = $1 ORDER BY created_at DESC",
    [listId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError("List items not found");
  }

  return result.rows;
};

// CREATE NEW LIST ITEM
const createListItem = async (listId, title) => {
  const result = await pool.query(
    "INSERT INTO list_items (list_id, title) VALUES ($1, $2) RETURNING *",
    [listId, title]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError("Failed to create list item");
  }

  return result.rows[0];
};

// GET LIST ITEM BY ID
const getListItemById = async (listId, itemId) => {
  const result = await pool.query(
    "SELECT * FROM list_items WHERE list_id = $1 AND id = $2",
    [listId, itemId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError("List item not found");
  }

  return result.rows[0];
};

// UPDATE A LIST ITEM
const updateListItem = async (listId, itemId, updatedTitle) => {
  const result = await pool.query(
    "UPDATE list_items SET title = $1 WHERE list_id = $2 AND id = $3 RETURNING *",
    [updatedTitle, listId, itemId]
  );
};

// TOGGLE COMPLETE STATUS OF A LIST ITEM
const toggleComplete = async (listId, itemId, bool) => {
  const result = await pool.query(
    "UPDATE list_items SET completed = $1 WHERE list_id = $2 AND id = $3 RETURNING *",
    [bool, listId, itemId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError("List item not found");
  }

  return result.rows[0];
};

// DELETE A LIST ITEM
const deleteListItem = async (listId, itemId) => {
  const result = await pool.query(
    "DELETE FROM list_items WHERE list_id = $1 AND id = $2 RETURNING *",
    [listId, itemId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError("List item not found");
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
