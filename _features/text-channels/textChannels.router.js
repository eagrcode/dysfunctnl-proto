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

const TEXT_CHANNELS_PREFIX = "/textChannelId";
const MESSAGES_PREFIX = `${TEXT_CHANNELS_PREFIX}/messages`;

// Text Channel Routes
textChannelsRouter.get("/", handleGetAllTextChannels);
textChannelsRouter.post("/", handleCreateTextChannel);
textChannelsRouter.get(`${TEXT_CHANNELS_PREFIX}`, handleGetTextChannelById);
textChannelsRouter.delete(`${TEXT_CHANNELS_PREFIX}`, handleDeleteTextChannel);
textChannelsRouter.patch(`${TEXT_CHANNELS_PREFIX}`, handleUpdateTextChannel);

// Messages Routes
textChannelsRouter.get(`${MESSAGES_PREFIX}`, handleGetAllMessages);
textChannelsRouter.post(`${MESSAGES_PREFIX}`, handleCreateMessage);
textChannelsRouter.delete(`${MESSAGES_PREFIX}/messageId`, handleDeleteMessage);
textChannelsRouter.patch(`${MESSAGES_PREFIX}/messageId`, handleUpdateMessage);

module.exports = textChannelsRouter;
