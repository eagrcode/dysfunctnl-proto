const { body, param, validationResult } = require("express-validator");
const { ValidationError } = require("../../_shared/utils/errors");
const {
  createGroup,
  getUserGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
} = require("./groups.model");

// CREATE GROUP
const handleCreateGroup = [
  body("name")
    .notEmpty()
    .withMessage("Group name is required")
    .trim()
    .escape()
    .isLength({ min: 1, max: 50 })
    .withMessage("Group name must be between 1 and 50 characters"),

  body("description")
    .notEmpty()
    .withMessage("Group description is required")
    .trim()
    .escape()
    .isLength({ max: 500 })
    .withMessage("Description must not exceed 500 characters"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError("Invalid group data", errors.array());
    }

    const { name, description } = req.body;
    const { id: userId } = req.user;

    const result = await createGroup(name, userId, description);

    res.status(201).json({
      success: true,
      data: result,
    });
  },
];

// GET USER GROUPS
const handleGetUserGroups = async (req, res) => {
  const { id: userId } = req.user;

  const result = await getUserGroups(userId);

  res.status(200).json({
    success: true,
    data: result,
  });
};

// GET GROUP BY ID
const handleGetGroupById = async (req, res) => {
  const { groupId } = req.params;

  const result = await getGroupById(groupId);

  res.status(200).json({
    success: true,
    data: result,
  });
};

// UPDATE GROUP
const handleUpdateGroup = [
  body("name")
    .optional()
    .trim()
    .escape()
    .isLength({ min: 1, max: 50 })
    .withMessage("Group name must be between 1 and 50 characters"),

  body("description")
    .optional()
    .trim()
    .escape()
    .isLength({ max: 500 })
    .withMessage("Description must not exceed 500 characters"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError("Invalid group data", errors.array());
    }

    const { groupId } = req.params;
    const updates = {};

    if (req.body.name !== undefined) {
      updates.name = req.body.name;
    }
    if (req.body.description !== undefined) {
      updates.description = req.body.description;
    }

    const result = await updateGroup(updates, groupId);

    res.status(200).json({
      success: true,
      data: result,
    });
  },
];

// DELETE GROUP
const handleDeleteGroup = async (req, res) => {
  const { groupId } = req.params;

  const result = await deleteGroup(groupId);

  res.status(200).json({
    success: true,
    data: result,
  });
};

module.exports = {
  handleCreateGroup,
  handleGetUserGroups,
  handleGetGroupById,
  handleUpdateGroup,
  handleDeleteGroup,
};
