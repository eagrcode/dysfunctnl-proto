const getAllMessages = async (req, res) => {
  const { textChannelId } = req.params;
  res.send(`Messages for text channel with ID: ${textChannelId}`);
};

const createMessage = async (req, res) => {
  const { textChannelId } = req.params;
  const newMessage = req.body;
  res.send(
    `Newly created message ID: ${newMessage.id}, Content: ${newMessage.content} in text channel ID: ${textChannelId}`
  );
};

const deleteMessage = async (req, res) => {
  const { textChannelId, messageId } = req.params;
  res.send(
    `Message with ID: ${messageId} deleted from text channel with ID: ${textChannelId}`
  );
};

const updateMessage = async (req, res) => {
  const { textChannelId, messageId } = req.params;
  const updatedData = req.body;
  res.send(
    `Message with ID: ${messageId} in text channel with ID: ${textChannelId} updated, Data: ${JSON.stringify(
      updatedData
    )}`
  );
};

module.exports = {
  getAllMessages,
  createMessage,
  deleteMessage,
  updateMessage,
};
