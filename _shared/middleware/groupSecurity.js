const pool = require("../utils/db");
const { ForbiddenError } = require("../utils/errors");

const PERMISSION_LEVELS = {
  MEMBER: "member",
  ADMIN: "admin",
  CREATOR: "creator",
};

const checkPermissionLevel = (membership, level) => {
  if (!membership) return false;

  switch (level) {
    case PERMISSION_LEVELS.MEMBER:
      return true;
    case PERMISSION_LEVELS.ADMIN:
      return membership.is_admin === true;
    case PERMISSION_LEVELS.CREATOR:
      return membership.is_creator === true;
    default:
      return false;
  }
};

const permissionRequired = (level) => {
  return async (req, res, next) => {
    const { groupId } = req.params;
    const userId = req.user.id;

    console.log(`\n→ Checking user is ${level === "member" ? "a member" : `an ${level}`}...`);
    console.log(`URL: ${req.originalUrl}`);

    if (!req.groupMembership) {
      console.log(`Loading membership from DB...`);

      const result = await pool.query(
        `SELECT 
          gm.group_id, 
          gmr.is_admin, 
          g.created_by = $1 as is_creator
        FROM group_members gm 
        LEFT JOIN group_members_roles gmr 
          ON gm.user_id = gmr.user_id 
          AND gm.group_id = gmr.group_id
        LEFT JOIN groups g 
          ON g.id = gm.group_id
        WHERE gm.user_id = $1 AND gm.group_id = $2`,
        [userId, groupId]
      );

      if (result.rows.length === 0) {
        throw new ForbiddenError("Not a group member");
      }

      req.groupMembership = result.rows[0];

      console.log(
        `Membership loaded (admin: ${req.groupMembership.is_admin}, creator: ${req.groupMembership.is_creator})`
      );
    } else {
      console.log(
        `Using cached membership (admin: ${req.groupMembership.is_admin}, creator: ${req.groupMembership.is_creator})`
      );
    }

    const hasPermission = checkPermissionLevel(req.groupMembership, level);

    if (!hasPermission) {
      throw new ForbiddenError(`Requires ${level} permission`);
    }

    next();
  };
};

module.exports = permissionRequired;
