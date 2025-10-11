const { Router } = require("express");
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
textChannelsRouter.post("/", handleCreateTextChannel);
textChannelsRouter.get("/:textChannelId", handleGetTextChannelById);
textChannelsRouter.delete("/:textChannelId", handleDeleteTextChannel);
textChannelsRouter.patch("/:textChannelId", handleUpdateTextChannel);

// Messages Routes
textChannelsRouter.get("/messages", handleGetAllMessages);
textChannelsRouter.post("/messages", handleCreateMessage);
textChannelsRouter.delete("/messages/:messageId", handleDeleteMessage);
textChannelsRouter.patch("/messages/:messageId", handleUpdateMessage);

module.exports = textChannelsRouter;
