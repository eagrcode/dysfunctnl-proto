const { Router } = require("express");
const permissionRequired = require("../../_shared/middleware/groupSecurity");
const checkMessageOwnership = require("../../_shared/middleware/resouce-management/checkMessageOwnership");
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

const textChannelsRouter = Router({ mergeParams: true });

// Text Channel Routes
textChannelsRouter.get("/", handleGetAllTextChannels);
textChannelsRouter.post("/", permissionRequired("admin"), handleCreateTextChannel);
textChannelsRouter.get("/:textChannelId", handleGetTextChannelById);
textChannelsRouter.delete("/:textChannelId", permissionRequired("admin"), handleDeleteTextChannel);
textChannelsRouter.patch("/:textChannelId", permissionRequired("admin"), handleUpdateTextChannel);

// Messages Routes
textChannelsRouter.get("/:textChannelId/messages", handleGetAllMessages);
textChannelsRouter.post("/:textChannelId/messages", handleCreateMessage);
textChannelsRouter.patch(
  "/:textChannelId/messages/:messageId/delete",
  checkMessageOwnership,
  handleDeleteMessage
);
textChannelsRouter.patch(
  "/:textChannelId/messages/:messageId/update",
  checkMessageOwnership,
  handleUpdateMessage
);

module.exports = textChannelsRouter;
