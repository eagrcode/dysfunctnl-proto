const {
  getAllLists,
  createList,
  getListById,
  updateList,
  deleteList,
} = require("../models/listsModel");
const { getListItems } = require("../models/listItemsModel");

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
  const { data } = req.body;

  const result = await createList(groupId, data);

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

  const result = await updateList(groupId, listId, data);

  res.status(201).json({
    success: true,
    data: result,
  });
};

// DELETE LIST
const handleDeleteList = async (req, res) => {
  const { groupId, listId } = req.params;

  const result = await deleteList(groupId, listId);

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
