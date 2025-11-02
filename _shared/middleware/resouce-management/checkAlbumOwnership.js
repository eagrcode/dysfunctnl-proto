const resourceOwnershipChecker = require("./resourceOwnershipChecker");

const checkAlbumOwnership = resourceOwnershipChecker({
  resourceName: "album",
  tableName: "media_albums",
  ownerColumn: "created_by",
  parentColumn: "group_id",
  parentParam: "groupId",
  paramName: "albumId",
  allowAdminOverride: true,
});

module.exports = checkAlbumOwnership;
