const pool = require("../../_shared/utils/db");
const withTransaction = require("../../_shared/utils/queryTransaction");

// CREATE GROUP
const createGroup = async (name, createdById, description) => {
  return withTransaction(async (client) => {
    const groupResult = await client.query(
      "INSERT INTO groups (name, created_by, description) VALUES ($1, $2, $3) RETURNING *",
      [name, createdById, description]
    );
    const groupResultId = groupResult.rows[0].id;

    const memberResult = await client.query(
      "INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) RETURNING *",
      [groupResultId, createdById]
    );

    const memberRoleResult = await client.query(
      "insert into group_members_roles (user_id, group_id, is_admin) values ($1, $2, $3) returning is_admin",
      [createdById, groupResultId, true]
    );

    return {
      group: groupResult.rows[0],
      member: memberResult.rows[0],
      role: memberRoleResult.rows[0],
    };
  });
};

// GET GROUP BY ID
const getGroupById = async (groupId) => {
  const result = await pool.query("SELECT * FROM groups WHERE id = $1", [groupId]);

  return result.rows[0];
};

// UPDATE GROUP
const updateGroup = async (updates, groupId) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  // Dynamic query based on provided updates
  if (updates.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    fields.push(`description = $${paramIndex++}`);
    values.push(updates.description);
  }

  // Update the timestamp
  fields.push(`updated_at = NOW()`);

  // Add groupId as the final parameter
  values.push(groupId);

  const query = `
      UPDATE groups 
      SET ${fields.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING name, description, updated_at
    `;

  const result = await pool.query(query, values);

  return result.rows[0];
};

// DELETE GROUP
const deleteGroup = async (groupId) => {
  const result = await pool.query("DELETE FROM groups WHERE id = $1 RETURNING id, name", [groupId]);

  return result.rows[0];
};

module.exports = {
  createGroup,
  getGroupById,
  updateGroup,
  deleteGroup,
};
