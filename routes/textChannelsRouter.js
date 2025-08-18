/* TEXT CHANNEL ROUTES */

const { Router } = require("express");
const textChannelsMessagesRouter = require("./textChannelsMessagesRouter");
const {
  getAllTextChannels,
  createTextChannel,
  getTextChannelById,
  updateTextChannel,
  deleteTextChannel,
} = require("../controllers/textChannelsController");

const textChannelsRouter = Router({ mergeParams: true });

// Get all text channels for a group
textChannelsRouter.get("/", getAllTextChannels);

// Get a specific text channel in a group
textChannelsRouter.get("/:textChannelId", getTextChannelById);

// Create a new text channel in a group
textChannelsRouter.post("/", createTextChannel);

// Delete a text channel from a group
textChannelsRouter.delete("/:textChannelId", deleteTextChannel);

// Update a text channel in a group
textChannelsRouter.patch("/:textChannelId", updateTextChannel);

// Mount messages router
textChannelsRouter.use("/:textChannelId/messages", textChannelsMessagesRouter);

module.exports = textChannelsRouter;
