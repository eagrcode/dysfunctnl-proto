const { getAllLists, createList, getListById, updateList, deleteList } = require("./lists.model");
const { getListItems } = require("./list-items/listItems.model");
const { body, validationResult } = require("express-validator");
const { ValidationError } = require("../../_shared/utils/errors");

const reqValidation = {
  handleCreateList: [
    body("listType").isIn(["todo", "shopping", "other"]).withMessage("Invalid list type"),
    body("assignedTo").optional().isUUID().withMessage("Invalid assignedTo user ID format"),
    body("title")
      .notEmpty()
      .withMessage("List title is required")
      .trim()
      .escape()
      .isLength({ min: 1, max: 200 })
      .withMessage("List title must be between 1 and 200 characters"),
  ],
  handleUpdateList: [
    body("title")
      .optional()
      .trim()
      .escape()
      .isLength({ min: 1, max: 200 })
      .withMessage("List title must be between 1 and 200 characters"),
    body("listType")
      .optional()
      .isIn(["todo", "shopping", "other"])
      .withMessage("Invalid list type"),
    body("assignedTo").optional().isUUID().withMessage("Invalid assignedTo user ID format"),
  ],
};

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
const handleCreateList = [
  ...reqValidation.handleCreateList,

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError("Validation failed", errors.array());
    }

    const { groupId } = req.params;
    const { listType, title, assignedTo } = req.body;
    userId = req.user.id;

    const result = await createList(userId, groupId, listType, title, assignedTo);

    res.status(201).json({
      success: true,
      data: result,
    });
  },
];

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
const handleUpdateList = [
  ...reqValidation.handleUpdateList,

  async (req, res) => {
    const { groupId, listId } = req.params;
    const { title, listType, assignedTo } = req.body;
    const { is_admin } = req.groupMembership;
    const userId = req.user.id;

    const data = {};
    if (title !== undefined) data.title = title;
    if (listType !== undefined) data.listType = listType;
    if (assignedTo !== undefined) data.assignedTo = assignedTo;

    const result = await updateList(groupId, listId, data, is_admin, userId);

    res.status(200).json({
      success: true,
      data: result,
    });
  },
];

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
