const pool = require("../../_shared/utils/db");
const { NotFoundError, ForbiddenError } = require("../../_shared/utils/errors");
const withTransaction = require("../../_shared/utils/queryTransaction");

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
const createList = async (userId, groupId, listType, title, assignedTo, itemsArr = []) => {
  return withTransaction(async (client) => {
    const listRes = await client.query(
      `INSERT INTO lists 
       (created_by, group_id, list_type, title, assigned_to) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [userId, groupId, listType, title, assignedTo],
    );

    const listData = listRes.rows[0];

    const listId = listData.id;

    if (itemsArr.length > 0) {
      const itemValues = itemsArr.map((item, index) => `($1, $${index + 2})`).join(", ");
      const itemsRes = await client.query(
        `INSERT INTO list_items (list_id, content) VALUES ${itemValues} RETURNING *`,
        [listId, ...itemsArr],
      );

      listData.items = itemsRes ? itemsRes.rows : [];
    }

    return listData;
  });
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

// UPDATE A LIST
const updateList = async (groupId, listId, updates, is_admin, userId) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  // Dynamic query based on provided updates
  if (updates.listType !== undefined) {
    fields.push(`list_type = $${paramIndex++}`);
    values.push(updates.listType);
  }
  if (updates.title !== undefined) {
    fields.push(`title = $${paramIndex++}`);
    values.push(updates.title);
  }
  if (updates.assignedTo !== undefined) {
    fields.push(`assigned_to = $${paramIndex++}`);
    values.push(updates.assignedTo);
  }
  if (updates.dueDate !== undefined) {
    fields.push(`due_date = $${paramIndex++}`);
    values.push(updates.dueDate);
  }

  // Update the timestamp
  fields.push(`updated_at = NOW()`);

  // Add groupId and listId as the final parameters
  values.push(groupId, listId, userId, is_admin);

  const query = `
      UPDATE lists
      SET ${fields.join(", ")}
      WHERE group_id = $${paramIndex++} 
      AND id = $${paramIndex++}
      AND (created_by = $${paramIndex} OR assigned_to = $${paramIndex++} OR $${paramIndex} = true)
      RETURNING *
    `;

  const result = await pool.query(query, values);

  if (result.rows.length === 0) {
    throw new ForbiddenError("List not found or permission denied");
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
    throw new ForbiddenError("List not found or permission denied");
  }

  return result.rows[0];
};

module.exports = {
  getAllLists,
  createList,
  getListById,
  updateList,
  deleteList,
};
