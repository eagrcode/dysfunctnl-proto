const pool = require("../db");

// GET GROUP MEMBERS
const getGroupMembers = async (groupId) => {
  const result = await pool.query(
    `SELECT gm.user_id, gm.group_id, u.first_name, u.last_name, u.email 
    FROM group_members gm 
    INNER JOIN users u on gm.user_id = u.id 
    WHERE gm.group_id = $1`,
    [groupId]
  );

  return result.rows[0];
};

// GET GROUP MEMBER BY ID
const getGroupMemberById = async (groupId, userId) => {
  const result = await pool.query(
    `SELECT gm.user_id, gm.group_id, u.first_name, u.last_name, u.email 
    FROM group_members gm 
    INNER JOIN users u on gm.user_id = u.id 
    WHERE gm.group_id = $1
    AND gm.user_id = $2`,
    [groupId, userId]
  );

  return result.rows[0];
};

// ADD NEW MEMBER
const addUserToGroup = async (groupId, userIdToAdd) => {
  const result = await pool.query(
    "INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) RETURNING *",
    [groupId, userIdToAdd]
  );

  const memberRoleResult = await pool.query(
    "INSERT INTO group_members_roles (user_id, group_id, is_admin) VALUES ($1, $2, $3) RETURNING is_admin",
    [userIdToAdd, groupId, false]
  );

  return { member: result.rows[0], role: memberRoleResult.rows[0] };
};

// UPDATE MEMBER ROLE
const updateMemberRole = async (bool, groupId, userId) => {
  const result = await pool.query(
    "UPDATE group_members_roles SET is_admin = $1 WHERE group_id = $2 AND user_id = $3 RETURNING *",
    [bool, groupId, userId]
  );

  return result.rows[0];
};

// REMOVE MEMBER FROM gROUP
const removeMemberFromGroup = async (groupId, userId) => {
  const result = await pool.query(
    "DELETE FROM group_members WHERE user_id = $1",
    [groupId, userId]
  );

  return result.rows[0];
};

module.exports = {
  getGroupMembers,
  getGroupMemberById,
  addUserToGroup,
  updateMemberRole,
  removeMemberFromGroup,
};
