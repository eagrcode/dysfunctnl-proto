const { logger } = require("../../lib/logger");
const pool = require("../../db/pool");
const { ForbiddenError, NotFoundError } = require("../../lib/errors");

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

    logger.debug("Checking group permission", { groupId, userId, requiredLevel: level });

    if (!req.groupMembership) {
      logger.debug("Loading group membership from database", { groupId, userId });

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
        throw new NotFoundError("Group not found");
      }

      req.groupMembership = result.rows[0];

      logger.debug("Group membership loaded", {
        groupId,
        userId,
        isAdmin: req.groupMembership.is_admin,
        isCreator: req.groupMembership.is_creator,
      });
    }

    logger.debug("Using group membership", {
      groupId,
      userId,
      isAdmin: req.groupMembership.is_admin,
      isCreator: req.groupMembership.is_creator,
    });

    const hasPermission = checkPermissionLevel(req.groupMembership, level);

    if (!hasPermission) {
      logger.debug("Group permission denied", { groupId, userId, requiredLevel: level });
      throw new ForbiddenError(`Requires ${level} permission`);
    }

    next();
  };
};

module.exports = permissionRequired;
