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

const requirePermissionLevel = (level) => {
  return (req, res, next) => {
    const hasPermission = checkPermissionLevel(req.groupMembership, level);

    if (!hasPermission) {
      throw new ForbiddenError(`Requires ${level} permission`);
    }
    next();
  };
};

const checkGroupAccess = async (req) => {
  if (!req.user) {
    throw new ForbiddenError("User not authenticated");
  }

  const { groupId } = req.params;
  const userId = req.user.id;
  let membership = req.groupMembership;

  logger.debug("Checking group access", { groupId, userId });

  if (!membership) {
    logger.debug("Loading group membership from database", { groupId, userId });

    const result = await pool.query(
      `
        SELECT
          g.id AS group_id,
          g.created_by = $1 AS is_creator,
          gm.user_id IS NOT NULL AS is_member,
          COALESCE(gmr.is_admin, false) AS is_admin,
          g.type
        FROM groups g
        LEFT JOIN group_members gm
          ON g.id = gm.group_id
          AND gm.user_id = $1
        LEFT JOIN group_members_roles gmr
          ON gm.group_id = gmr.group_id
          AND gmr.user_id = $1
        WHERE g.id = $2
      `,
      [userId, groupId],
    );

    membership = result.rows[0];
  }

  if (!membership) return false;

  let hasAccess = false;

  switch (membership.type) {
    case "personal":
      hasAccess = membership.is_creator === true;
      break;
    case "shared":
      hasAccess = membership.is_member === true;
      break;
  }

  if (!hasAccess) return false;

  req.groupMembership = {
    ...membership,
    is_admin: membership.type === "personal" ? true : membership.is_admin,
  };

  logger.debug("Using group membership", req.groupMembership);

  return true;
};

const requireGroupAccess = () => {
  return async (req, res, next) => {
    const hasAccess = await checkGroupAccess(req);

    if (!hasAccess) {
      throw new NotFoundError("Group not found");
    }

    next();
  };
};

module.exports = { requireGroupAccess, requirePermissionLevel };
