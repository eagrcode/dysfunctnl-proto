const {
  getListItems,
  createListItem,
  getListItemById,
  updateListItem,
  toggleComplete,
  deleteListItem,
} = require("./listItems.model");
const { body, validationResult } = require("express-validator");
const { ValidationError } = require("../../../_shared/utils/errors");

const validationAssertions = [
  body("content")
    .notEmpty()
    .withMessage("Item content is required")
    .trim()
    .escape()
    .isLength({ min: 1, max: 1000 })
    .withMessage("Item content must be between 1 and 1000 characters"),
];

// CREATE A NEW LIST ITEM
const handleCreateListItem = [
  ...validationAssertions,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError("Validation failed", errors.array());
    }

    const { listId } = req.params;
    const { content } = req.body;
    const { is_admin } = req.groupMembership;
    const userId = req.user.id;

    const result = await createListItem(listId, content, is_admin, userId);

    res.status(201).json({
      success: true,
      data: result,
    });
  },
];

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
const handleUpdateListItem = [
  ...validationAssertions,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError("Validation failed", errors.array());
    }

    const { listId, itemId } = req.params;
    const { content } = req.body;
    const { is_admin } = req.groupMembership;
    const userId = req.user.id;

    const result = await updateListItem(listId, itemId, content, is_admin, userId);

    res.status(200).json({
      success: true,
      data: result,
    });
  },
];

// TOGGLE COMPLETE STATUS OF A LIST ITEM
const handleToggleComplete = [
  body("completed").isBoolean().withMessage("Completed must be a boolean"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError("Validation failed", errors.array());
    }

    const { listId, itemId } = req.params;
    const { completed } = req.body;
    const { is_admin } = req.groupMembership;
    const userId = req.user.id;

    const result = await toggleComplete(listId, itemId, completed, is_admin, userId);

    res.status(200).json({
      success: true,
      data: result,
    });
  },
];

// DELETE A LIST ITEM
const handleDeleteListItem = async (req, res) => {
  const { listId, itemId } = req.params;
  const { is_admin } = req.groupMembership;
  const userId = req.user.id;

  const result = await deleteListItem(listId, itemId, is_admin, userId);

  res.status(200).json({
    success: true,
    data: result,
  });
};

module.exports = {
  handleCreateListItem,
  handleGetListItemById,
  handleUpdateListItem,
  handleToggleComplete,
  handleDeleteListItem,
};
