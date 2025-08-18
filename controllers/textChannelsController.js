const getAllTextChannels = async (req, res) => {
  const { groupId } = req.params;
  res.send(`Text channels for group with ID: ${groupId}`);
};

const createTextChannel = async (req, res) => {
  const { groupId } = req.params;
  const newChannel = req.body;
  res.send(
    `Newly created text channel ID: ${newChannel.id}, Name: ${newChannel.name} in group ID: ${groupId}`
  );
};

const getTextChannelById = async (req, res) => {
  const { groupId, textChannelId } = req.params;
  res.send(
    `Details for text channel with ID: ${textChannelId} in group with ID: ${groupId}`
  );
};

const updateTextChannel = async (req, res) => {
  const { groupId, textChannelId } = req.params;
  const updatedData = req.body;
  res.send(
    `Text channel with ID: ${textChannelId} in group with ID: ${groupId} updated, Data: ${JSON.stringify(
      updatedData
    )}`
  );
};

const deleteTextChannel = async (req, res) => {
  const { groupId, textChannelId } = req.params;
  res.send(
    `Text channel with ID: ${textChannelId} deleted from group with ID: ${groupId}`
  );
};

module.exports = {
  getAllTextChannels,
  createTextChannel,
  getTextChannelById,
  updateTextChannel,
  deleteTextChannel,
};
