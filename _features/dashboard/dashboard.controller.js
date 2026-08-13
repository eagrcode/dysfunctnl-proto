const {
  getListsData,
  getAlbumsData,
  getTextChannelMessagesData,
  getCalendarData,
} = require("./dashboard.model");

const handleGetListsData = async (req, res) => {
  const { groupId } = req.params;

  const data = await getListsData(groupId);

  res.status(200).json(data);
};

const handleGetAlbumsData = async (req, res) => {
  const { groupId } = req.params;

  const data = await getAlbumsData(groupId);

  res.status(200).json(data);
};

const handleGetTextChannelMessagesData = async (req, res) => {
  const { groupId } = req.params;

  const data = await getTextChannelMessagesData(groupId);

  res.status(200).json(data);
};

const handleGetCalendarData = async (req, res) => {
  const { groupId } = req.params;

  const data = await getCalendarData(groupId);

  res.status(200).json(data);
};

module.exports = {
  handleGetListsData,
  handleGetAlbumsData,
  handleGetTextChannelMessagesData,
  handleGetCalendarData,
};
