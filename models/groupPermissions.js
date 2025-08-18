const pool = require("../db");

// Check if a user is a member of a group
const checkMembership = async (userId, groupId, dbClient = pool) => {
  console.log("=== CHECK MEMBERSHIP DEBUG ===");

  try {
    // Use the client passed in (should be req.dbClient)
    const rlsContext = await dbClient.query(
      "SELECT current_setting('app.current_user_id', true) as current_user"
    );
    console.log("RLS context:", rlsContext.rows[0]);

    const result = await dbClient.query(
      "SELECT user_id, role FROM group_members WHERE user_id = $1 AND group_id = $2",
      [userId, groupId]
    );
    console.log("Query result:", result.rows);
    return result.rows[0] || null;
  } catch (error) {
    throw new Error(`Membership check failed: ${error.message}`);
  }
};

const checkIsAdmin = async (userId, groupId, dbClient = pool) => {
  try {
    const membership = await checkMembership(userId, groupId, dbClient);
    return membership && membership.role === "admin";
  } catch (error) {
    throw new Error(`Admin check failed: ${error.message}`);
  }
};

// Define function for middleware to require membership
const requireMembership = async (userId, groupId) => {
  console.log("=== REQUIRE MEMBERSHIP DEBUG ===");
  console.log("1. User ID from auth middleware:", userId);
  console.log("2. Group ID from request parameters:", groupId);

  const membership = await checkMembership(userId, groupId);
  if (!membership) {
    const error = new Error("Access denied: Not a group member");
    error.statusCode = 403;
    throw error;
  }
  return membership;
};

// Define function for middleware to require admin privileges
const requireAdmin = async (userId, groupId) => {
  const isAdmin = await checkIsAdmin(userId, groupId);

  if (!isAdmin) {
    const error = new Error("Access denied: Admin privileges required");
    error.statusCode = 403;
    throw error;
  }
  return true;
};

module.exports = {
  requireMembership,
  requireAdmin,
};
