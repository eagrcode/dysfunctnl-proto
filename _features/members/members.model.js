const pool = require("../../_shared/utils/db");
const { NotFoundError, ConflictError } = require("../../_shared/utils/errors");

// GET GROUP MEMBERS
const getGroupMembers = async (groupId) => {
  const result = await pool.query(
    `SELECT gm.user_id, gm.group_id, gm.joined_at, u.first_name, u.last_name, u.email, gmr.is_admin
    FROM group_members gm 
    INNER JOIN users u on gm.user_id = u.id
    INNER JOIN group_members_roles gmr on gm.user_id = gmr.user_id AND gm.group_id = gmr.group_id
    WHERE gm.group_id = $1`,
    [groupId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError("Group not found or has no members");
  }

  return result.rows;
};

// GET GROUP MEMBER BY ID
const getGroupMemberById = async (groupId, userId) => {
  const result = await pool.query(
    `SELECT gm.user_id, gm.group_id, gm.joined_at, u.first_name, u.last_name, u.email, gmr.is_admin
    FROM group_members gm 
    INNER JOIN users u on gm.user_id = u.id
    INNER JOIN group_members_roles gmr on gm.user_id = gmr.user_id AND gm.group_id = gmr.group_id
    WHERE gm.group_id = $1
    AND gm.user_id = $2`,
    [groupId, userId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError("Member not found in this group");
  }

  return result.rows[0];
};

// ADD NEW MEMBER
const addUserToGroup = async (groupId, userIdToAdd) => {
  try {
    const result = await pool.query(
      "INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) RETURNING *",
      [groupId, userIdToAdd]
    );

    const memberRoleResult = await pool.query(
      "INSERT INTO group_members_roles (user_id, group_id, is_admin) VALUES ($1, $2, $3) RETURNING is_admin",
      [userIdToAdd, groupId, false]
    );

    return { member: result.rows[0], role: memberRoleResult.rows[0] };
  } catch (error) {
    // Transform Postgres constraint errors
    if (error.code === "23505") {
      throw new ConflictError("User is already a member of this group");
    }
    if (error.code === "23503") {
      throw new NotFoundError("User not found");
    }
    throw error;
  }
};

// UPDATE MEMBER ROLE
const updateMemberRole = async (bool, groupId, userId) => {
  const result = await pool.query(
    "UPDATE group_members_roles SET is_admin = $1 WHERE group_id = $2 AND user_id = $3 RETURNING *",
    [bool, groupId, userId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError("Member not found in this group");
  }

  return result.rows[0];
};

// REMOVE MEMBER FROM GROUP
const removeMemberFromGroup = async (groupId, userId) => {
  const result = await pool.query(
    "DELETE FROM group_members WHERE group_id = $1 AND user_id = $2 RETURNING *",
    [groupId, userId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError("Member not found in this group");
  }

  return result.rows[0];
};

module.exports = {
  getGroupMembers,
  getGroupMemberById,
  addUserToGroup,
  updateMemberRole,
  removeMemberFromGroup,
};
