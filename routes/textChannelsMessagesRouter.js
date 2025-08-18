const { Router } = require("express");
const {
  getAllMessages,
  createMessage,
  deleteMessage,
  updateMessage,
} = require("../controllers/textChannelsMessagesController");

const textChannelsMessagesRouter = Router({ mergeParams: true });

// Get all messages in a text channel
textChannelsMessagesRouter.get("/", getAllMessages);

// Create a new message in a text channel
textChannelsMessagesRouter.post("/", createMessage);

// Delete a message from a text channel
textChannelsMessagesRouter.delete("/:messageId", deleteMessage);

// Update a message in a text channel
textChannelsMessagesRouter.patch("/:messageId", updateMessage);

module.exports = textChannelsMessagesRouter;
