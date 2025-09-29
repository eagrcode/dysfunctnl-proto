const {
  getListItems,
  createListItem,
  getListItemById,
  updateListItem,
  toggleComplete,
  deleteListItem,
} = require("../models/listItemsModel");

// GET LIST ITEMS
const handleGetListItems = async (req, res) => {
  const { listId } = req.params;

  const result = await getListItems(listId);

  res.status(200).json({
    success: true,
    data: result,
  });
};

// CREATE A NEW LIST ITEM
const handleCreateListItem = async (req, res) => {
  const { listId } = req.params;
  const { title } = req.body;

  const result = await createListItem(listId, title);

  res.status(201).json({
    success: true,
    data: result,
  });
};

// GET LIST ITEM BY ID
const handleGetListItemById = async (req, res) => {
  const { listId, itemId } = req.params;

  const result = await getListItemById(listId, itemId);

  res.status(200).json({
    success: true,
    data: result,
  });
};

// UPDATE A LIST ITEM
const handleUpdateListItem = async (req, res) => {
  const { listId, itemId } = req.params;
  const { title } = req.body;

  const result = await updateListItem(listId, itemId, title);

  res.status(200).json({
    success: true,
    data: result,
  });
};

// TOGGLE COMPLETE STATUS OF A LIST ITEM
const handleToggleComplete = async (req, res) => {
  const { listId, itemId } = req.params;
  const { completed } = req.body;

  const result = await toggleComplete(listId, itemId, completed);

  res.status(200).json({
    success: true,
    data: result,
  });
};

// DELETE A LIST ITEM
const handleDeleteListItem = async (req, res) => {
  const { listId, itemId } = req.params;

  const result = await deleteListItem(listId, itemId);

  res.status(200).json({
    success: true,
    data: result,
  });
};

module.exports = {
  handleGetListItems,
  handleCreateListItem,
  handleGetListItemById,
  handleUpdateListItem,
  handleToggleComplete,
  handleDeleteListItem,
};
