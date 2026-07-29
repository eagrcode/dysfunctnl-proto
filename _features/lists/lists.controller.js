const {
  getAllLists,
  createList,
  getListById,
  updateList,
  deleteList,
  renameList,
} = require("./lists.model");
const { getListItems } = require("./list-items/listItems.model");
const { body, validationResult } = require("express-validator");
const { ValidationError } = require("../../_shared/utils/errors");
const {
  parsePaginationParams,
  buildPaginationResponse,
} = require("../../_shared/utils/pagination");
const { broadcastGroupEvent } = require("../../_shared/utils/socketService");

const reqValidation = {
  handleCreateList: [
    body("listType").isIn(["todo", "shopping", "other"]).withMessage("Invalid list type"),
    body("assignedTo").optional().isUUID().withMessage("Invalid assignedTo user ID format"),
    body("itemsArr").optional().isArray(),
    body("title")
      .notEmpty()
      .withMessage("List title is required")
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("List title must be between 1 and 100 characters"),
  ],
  handleUpdateList: [
    body("title")
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("List title must be between 1 and 100 characters"),
    body("listType")
      .optional()
      .isIn(["todo", "shopping", "other"])
      .withMessage("Invalid list type"),
    body("assignedTo").optional().isUUID().withMessage("Invalid assignedTo user ID format"),
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
  const { data, pagination } = buildPaginationResponse(rows, limit, "created_at");

  res.status(200).json({
    success: true,
    data,
    pagination,
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
    const { listType, title } = req.body;
    const userId = req.user.id;

    const result = await createList(userId, groupId, listType, title);

    // const payload = {
    //   id: result.id,
    //   groupId: groupId,
    //   listType: listType,
    //   title: title,
    //   createdAt: result.created_at,
    // };

    // WebSocket broadcast
    broadcastGroupEvent(groupId, "list.created", result);

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
// const handleUpdateList = [
//   ...reqValidation.handleUpdateList,

//   async (req, res) => {
//     const { groupId, listId } = req.params;
//     const { title, listType, assignedTo } = req.body;
//     const { is_admin } = req.groupMembership;
//     const userId = req.user.id;

//     const data = {};
//     if (title !== undefined) data.title = title;
//     if (listType !== undefined) data.listType = listType;
//     if (assignedTo !== undefined) data.assignedTo = assignedTo;

//     const result = await updateList(groupId, listId, data, is_admin, userId);

//     res.status(200).json({
//       success: true,
//       data: result,
//     });
//   },
// ];

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
  handleDeleteList,
  handleRenameList,
};
