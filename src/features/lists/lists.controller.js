const { getAllLists, createList, getListById, deleteList, renameList } = require("./lists.model");
const { getListItems } = require("./list-items/listItems.model");
const { body, validationResult } = require("express-validator");
const { ValidationError } = require("../../lib/errors");
const {
  parsePaginationParams,
  buildPaginationResponse,
} = require("../../lib/pagination");
const { broadcastGroupEvent } = require("../../realtime/socket-service");

const reqValidation = {
  handleCreateList: [
    body("listType").isIn(["todo", "shopping", "other"]).withMessage("Invalid list type"),
    body("assignedTo").optional().isUUID().withMessage("Invalid assignedTo user ID format"),
    body("title")
      .notEmpty()
      .withMessage("List title is required")
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("List title must be between 1 and 100 characters"),
  ],
  handleRenameList: [
    body("newTitle")
      .notEmpty()
      .withMessage("New title is required")
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("New title must be between 1 and 100 characters"),
  ],
};

// GET ALL LISTS
const handleGetAllLists = async (req, res) => {
  const { groupId } = req.params;
  const { limit, cursor } = parsePaginationParams(req.query);

  const rows = await getAllLists(groupId, { limit, cursor });
  const { data } = buildPaginationResponse(rows, limit, "created_at");

  res.status(200).json(data);
};

// CREATE NEW LIST
const handleCreateList = [
  ...reqValidation.handleCreateList,

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError("Validation failed", errors.array());
    }

    const { groupId } = req.params;
    const { listType, title } = req.body;
    const userId = req.user.id;

    const result = await createList(userId, groupId, listType, title);

    // WebSocket broadcast
    broadcastGroupEvent(groupId, "list.created", result);

    res.status(201).json(result);
  },
];

// GET LIST BY ID
const handleGetListById = async (req, res) => {
  const { groupId, listId } = req.params;

  const result = await getListById(groupId, listId);
  const items = await getListItems(listId);

  result.items = items;

  res.status(200).json(result);
};

// RENAME LIST
const handleRenameList = [
  ...reqValidation.handleRenameList,

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError("Validation failed", errors.array());
    }

    const { groupId, listId } = req.params;
    const { newTitle } = req.body;
    const { is_admin } = req.groupMembership;
    const userId = req.user.id;

    const result = await renameList(groupId, listId, newTitle.trim(), is_admin, userId);

    // WebSocket broadcast
    broadcastGroupEvent(groupId, "list.renamed", result);

    res.status(200).json(result);
  },
];

// DELETE LIST
const handleDeleteList = async (req, res) => {
  const { groupId, listId } = req.params;
  const { is_admin } = req.groupMembership;
  const userId = req.user.id;

  const result = await deleteList(groupId, listId, is_admin, userId);

  // WebSocket broadcast
  broadcastGroupEvent(groupId, "list.deleted", result);

  res.status(200).json(result);
};

module.exports = {
  handleGetAllLists,
  handleCreateList,
  handleGetListById,
  handleDeleteList,
  handleRenameList,
};
