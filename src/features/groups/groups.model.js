const pool = require("../../db/pool");
const withTransaction = require("../../db/transaction");
const crypto = require("node:crypto");
const { ConflictError } = require("../../lib/errors");

// CREATE GROUP
const createGroup = async (name, createdById, description, type) => {
  try {
    return await withTransaction(async (client) => {
      const groupResult = await client.query(
        `
      INSERT INTO groups
        (name, created_by, description, type)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
        [name, createdById, description, type],
      );

      const groupId = groupResult.rows[0].id;

      if (type === "shared") {
        await client.query(
          `
        INSERT INTO group_members (group_id, user_id)
        VALUES ($1, $2)
        `,
          [groupId, createdById],
        );

        await client.query(
          `
        INSERT INTO group_members_roles (user_id, group_id, is_admin)
        VALUES ($1, $2, true)
        `,
          [createdById, groupId],
        );
      }

      return groupResult.rows[0];
    });
  } catch (error) {
    if (error.code === "23505" && error.constraint === "groups_one_personal_per_owner") {
      throw new ConflictError("Personal space already exists");
    }

    throw error;
  }
};

// GET USER GROUPS
const getUserGroups = async (userId) => {
  const result = await pool.query(
    `
    SELECT DISTINCT g.*
    FROM groups g
    LEFT JOIN group_members gm
      ON gm.group_id = g.id
      AND gm.user_id = $1
    WHERE
      (g.type = 'personal' AND g.created_by = $1)
      OR
      (g.type = 'shared' AND gm.user_id IS NOT NULL)
    `,
    [userId],
  );

  return result.rows || [];
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

const createGroupInvite = async (groupId, invitedBy) => {
  return withTransaction(async (client) => {
    // Keep the database's existing expiry default and single-use invite design.
    const inviteResult = await client.query(
      `INSERT INTO group_invites (group_id, invited_by, invite_type)
       VALUES ($1, $2, 'code')
       RETURNING id, expires_at`,
      [groupId, invitedBy],
    );
    const invite = inviteResult.rows[0];

    for (let attempt = 0; attempt < 5; attempt++) {
      const code = crypto.randomInt(0, 1000000).toString().padStart(6, "0");
      const codeResult = await client.query(
        `INSERT INTO group_invite_codes (group_invite_id, code)
         VALUES ($1, $2)
         ON CONFLICT (code) DO NOTHING
         RETURNING code`,
        [invite.id, code],
      );

      if (codeResult.rows.length > 0) {
        return { ...invite, code: codeResult.rows[0].code };
      }
    }

    // Throwing also rolls back the invite if no unique code could be saved.
    throw new ConflictError("Could not generate a unique invite code. Please try again.");
  });
};

module.exports = {
  createGroup,
  getUserGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  createGroupInvite,
};
