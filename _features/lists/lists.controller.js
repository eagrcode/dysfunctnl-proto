const { getAllLists, createList, getListById, updateList, deleteList } = require("./lists.model");
const { getListItems } = require("./list-items/listItems.model");

// GET ALL LISTS
const handleGetAllLists = async (req, res) => {
  const { groupId } = req.params;

  const result = await getAllLists(groupId);

  res.status(200).json({
    success: true,
    data: result,
  });
};

// CREATE NEW LIST
const handleCreateList = async (req, res) => {
  const { groupId } = req.params;
  const { listType, title, assignedTo } = req.body.data;
  userId = req.user.id;

  const result = await createList(userId, groupId, listType, title, assignedTo);

  res.status(201).json({
    success: true,
    data: result,
  });
};

// GET LIST BY ID
const handleGetListById = async (req, res) => {
  const { groupId, listId } = req.params;

  const result = await getListById(groupId, listId);
  const items = await getListItems(listId);

  result.items = items;

  res.status(200).json({
    success: true,
    data: result,
  });
};

// UPDATE LIST
const handleUpdateList = async (req, res) => {
  const { groupId, listId } = req.params;
  const { data } = req.body;
  const { is_admin } = req.groupMembership;
  const userId = req.user.id;

  const result = await updateList(groupId, listId, data, is_admin, userId);

  res.status(201).json({
    success: true,
    data: result,
  });
};

// DELETE LIST
const handleDeleteList = async (req, res) => {
  const { groupId, listId } = req.params;
  const { is_admin } = req.groupMembership;
  const userId = req.user.id;

  const result = await deleteList(groupId, listId, is_admin, userId);

  res.status(200).json({
    success: true,
    data: result,
  });
};

module.exports = {
  handleGetAllLists,
  handleCreateList,
  handleGetListById,
  handleUpdateList,
  handleDeleteList,
};
