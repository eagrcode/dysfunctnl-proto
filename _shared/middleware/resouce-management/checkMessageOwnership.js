const resourceOwnershipChecker = require("./resourceOwnershipChecker");

const checkMessageOwnership = resourceOwnershipChecker({
  resourceName: "message",
  tableName: "text_channel_messages",
  ownerColumn: "sender_id",
  parentColumn: "channel_id",
  parentParam: "textChannelId",
  paramName: "messageId",
  allowAdminOverride: true,
});

module.exports = checkMessageOwnership;
