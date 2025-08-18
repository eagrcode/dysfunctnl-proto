const getAllLists = (req, res) => {
  const { groupId } = req.params;
  res.send(`All lists for group with ID: ${groupId}`);
};

const createList = (req, res) => {
  const { groupId } = req.params;
  const { name } = req.body;
  res.send(`List created for group with ID: ${groupId} with name: ${name}`);
};

const getListById = (req, res) => {
  const { groupId, listId } = req.params;
  res.send(`Get list with ID: ${listId} for group with ID: ${groupId}`);
};

const updateList = (req, res) => {
  const { groupId, listId } = req.params;
  const { name } = req.body;
  res.send(
    `List with ID: ${listId} for group with ID: ${groupId} updated with name: ${name}`
  );
};

const deleteList = (req, res) => {
  const { groupId, listId } = req.params;
  res.send(`List with ID: ${listId} for group with ID: ${groupId} deleted`);
};

module.exports = {
  getAllLists,
  createList,
  getListById,
  updateList,
  deleteList,
};
