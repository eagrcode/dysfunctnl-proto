const {
  createListItem,
  getListItemById,
  updateListItem,
  toggleComplete,
  toggleCompleteAll,
  deleteListItems,
} = require("./listItems.model");
const { body, validationResult } = require("express-validator");
const { ValidationError } = require("../../../lib/errors");
const { logger } = require("../../../lib/logger");
const { broadcastGroupEvent } = require("../../../realtime/socket-service");

const validateContent = [
  body("content")
    .notEmpty()
    .withMessage("Item content is required")
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Item content must be between 1 and 100 characters"),
];

const reqValidation = {
  handleCreateListItem: validateContent,
  handleUpdateListItem: validateContent,
  handleToggleComplete: [body("completed").isBoolean().withMessage("Completed must be a boolean")],
  handleToggleCompleteAll: [
    body("completed").isBoolean().withMessage("Completed must be a boolean"),
  ],
  handleDeleteListItems: [
    body("itemIds").isArray({ min: 1 }).withMessage("At least one item ID is required"),
    body("itemIds.*").isUUID().withMessage("Every item ID must be a valid UUID"),
  ],
};

// CREATE A NEW LIST ITEM
const handleCreateListItem = [
  ...reqValidation.handleCreateListItem,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError("Validation failed", errors.array());
    }

    const { groupId, listId } = req.params;
    const { content } = req.body;
    const { is_admin } = req.groupMembership;
    const userId = req.user.id;

    const result = await createListItem(groupId, listId, content, is_admin, userId);

    // WebSocket broadcast
    broadcastGroupEvent(groupId, "listItem.created", result);

    res.status(201).json(result);
  },
];

// GET LIST ITEM BY ID
const handleGetListItemById = async (req, res) => {
  const { groupId, listId, itemId } = req.params;

  const result = await getListItemById(groupId, listId, itemId);

  res.status(200).json(result);
};

// UPDATE A LIST ITEM
const handleUpdateListItem = [
  ...reqValidation.handleUpdateListItem,

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError("Validation failed", errors.array());
    }

    const { groupId, listId, itemId } = req.params;
    const { content } = req.body;
    const { is_admin } = req.groupMembership;
    const userId = req.user.id;

    const result = await updateListItem(groupId, listId, itemId, content, is_admin, userId);

    // WebSocket broadcast
    broadcastGroupEvent(groupId, "listItem.updated", result);

    res.status(200).json(result);
  },
];

// TOGGLE COMPLETE STATUS OF A LIST ITEM
const handleToggleComplete = [
  ...reqValidation.handleToggleComplete,

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError("Validation failed", errors.array());
    }

    const { groupId, listId, itemId } = req.params;
    const { completed } = req.body;
    const { is_admin } = req.groupMembership;
    const userId = req.user.id;

    const result = await toggleComplete(groupId, listId, itemId, completed, is_admin, userId);

    // WebSocket broadcast
    broadcastGroupEvent(groupId, "listItem.toggled", result);

    res.status(200).json(result);
  },
];

const handleToggleCompleteAll = [
  ...reqValidation.handleToggleCompleteAll,

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError("Validation failed", errors.array());
    }

    const { groupId, listId } = req.params;
    const { completed } = req.body;
    const { is_admin } = req.groupMembership;
    const userId = req.user.id;

    logger.debug("Toggling all list items", { listId, completed });

    const result = await toggleCompleteAll(groupId, listId, completed, is_admin, userId);

    // WebSocket broadcast
    broadcastGroupEvent(groupId, "listItem.toggledAll", result);

    res.status(200).json(result);
  },
];

// DELETE LIST ITEMS
const handleDeleteListItems = [
  ...reqValidation.handleDeleteListItems,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError("Validation failed", errors.array());
    }

    const { groupId, listId } = req.params;
    const { itemIds } = req.body;
    const { is_admin } = req.groupMembership;
    const userId = req.user.id;

    const result = await deleteListItems(groupId, listId, itemIds, is_admin, userId);

    // WebSocket broadcast
    broadcastGroupEvent(groupId, "listItem.deleted", result);

    res.status(200).json(result);
  },
];

module.exports = {
  handleCreateListItem,
  handleGetListItemById,
  handleUpdateListItem,
  handleToggleComplete,
  handleToggleCompleteAll,
  handleDeleteListItems,
};
