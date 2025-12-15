const { Router, text } = require("express");
const permissionRequired = require("../../_shared/middleware/groupSecurity");
const {
  handleGetAllTextChannels,
  handleCreateTextChannel,
  handleGetTextChannelById,
  handleUpdateTextChannel,
  handleDeleteTextChannel,
} = require("./textChannels.controller");
const {
  handleGetAllMessages,
  handleCreateMessage,
  handleDeleteMessage,
  handleUpdateMessage,
} = require("./text-channel-messages/textChannelMessages.controller");
const validateUUIDParams = require("../../_shared/middleware/validateUUID");

const textChannelsRouter = Router({ mergeParams: true });

// textChannelsRouter.use("/:textChannelId", validateUUIDParams);
// textChannelsRouter.use("/:textChannelId/messages/:messageId", validateUUIDParams);

// Text Channel Routes
textChannelsRouter.get("/", handleGetAllTextChannels);
textChannelsRouter.post("/", permissionRequired("admin"), handleCreateTextChannel);
textChannelsRouter.get("/:textChannelId", handleGetTextChannelById);
textChannelsRouter.delete("/:textChannelId", permissionRequired("admin"), handleDeleteTextChannel);
textChannelsRouter.patch("/:textChannelId", permissionRequired("admin"), handleUpdateTextChannel);

// Messages Routes
textChannelsRouter.get("/:textChannelId/messages", handleGetAllMessages);
textChannelsRouter.post("/:textChannelId/messages", handleCreateMessage);
textChannelsRouter.delete("/:textChannelId/messages/:messageId", handleDeleteMessage);
textChannelsRouter.patch("/:textChannelId/messages/:messageId", handleUpdateMessage);

module.exports = textChannelsRouter;
