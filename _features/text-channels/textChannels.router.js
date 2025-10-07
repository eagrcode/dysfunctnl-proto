const { Router } = require("express");
const {
  handleGetAllTextChannels,
  handleCreateTextChannel,
  handleGetTextChannelById,
  handleUpdateTextChannel,
  handleDeleteTextChannel,
} = require("../controllers/textChannelsController");
const {
  handleGetAllMessages,
  handleCreateMessage,
  handleDeleteMessage,
  handleUpdateMessage,
} = require("../controllers/textChannelMessagesController");

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
