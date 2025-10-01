const pool = require("../db");
const { ForbiddenError } = require("../utils/errors");

const PERMISSION_LEVELS = {
  MEMBER: "member",
  ADMIN: "admin",
  CREATOR: "creator",
};

const checkPermission = (groups, groupId, level) => {
  const groupMatch = groups.find((g) => g.group_id === groupId);

  if (!groupMatch) return false;

  switch (level) {
    case PERMISSION_LEVELS.MEMBER:
      return true;
    case PERMISSION_LEVELS.ADMIN:
      return groupMatch.is_admin;
    case PERMISSION_LEVELS.CREATOR:
      return groupMatch.is_creator;
    default:
      return false;
  }
};

const permissionRequired = (level) => {
  return async (req, res, next) => {
    const { groupId } = req.params;

    try {
      const userGroups = await pool.query(
        `
        SELECT gm.group_id, gmr.is_admin, g.created_by = $1 as is_creator
        FROM group_members gm 
        LEFT JOIN group_members_roles gmr ON gm.user_id = gmr.user_id 
        AND gm.group_id = gmr.group_id
        LEFT JOIN groups g ON g.id = gm.group_id
        WHERE gm.user_id = $1
      `,
        [req.user.id]
      );

      console.log(
        `CHECKING PERMISSION ON PATH: ${req.route.path} ${req.method}`
      );

      const hasPermission = checkPermission(userGroups.rows, groupId, level);

      console.log(`PERMISSION GRANTED: ${hasPermission}`);

      if (!hasPermission) {
        return next(new ForbiddenError("Permission denied"));
      }

      next();
    } catch (error) {
      console.error("Permission check failed:", error);
      return res.status(500).json({ error: "Permission check failed" });
    }
  };
};

module.exports = permissionRequired;
