const { NotFoundError, ForbiddenError } = require("../../utils/errors");
const pool = require("../../utils/db");

const resourceOwnershipChecker = (config) => {
  const {
    resourceName,
    tableName,
    ownerColumn,
    parentColumn = null,
    parentParam = null,
    paramName,
    allowAdminOverride = false,
  } = config;

  return async (req, res, next) => {
    const resourceId = req.params[paramName];
    const parentParamId = req.params[parentParam];
    const userId = req.user.id;
    const { groupId } = req.params;
    const isAdmin = allowAdminOverride && req.groupMembership?.is_admin;

    console.log("ALLOW ADMIN OVERRIDE:", allowAdminOverride);
    console.log("IS ADMIN:", isAdmin);
    console.log(`\n→ Checking ownership for ${resourceName} ${resourceId}...`);

    const query = `
          SELECT ${ownerColumn}
          FROM ${tableName}
          WHERE id = $1 AND ${parentColumn} = $2
        `;
    const values = [resourceId, parentParamId];

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      throw new NotFoundError(`${resourceName} not found`);
    }

    const resource = result.rows[0];
    const ownerId = resource[ownerColumn];

    if (ownerId !== userId && !isAdmin) {
      throw new ForbiddenError(
        `You are not the owner of this ${resourceName}${
          allowAdminOverride ? ", or an admin user" : ""
        }`
      );
    }

    req[resourceName] = resource;

    console.log(`RESOURCE OWNER ID:`, resource[ownerColumn]);
    console.log(`User ${userId} is authorised to modify ${resourceName}`);

    next();
  };
};

module.exports = resourceOwnershipChecker;
