const { body, param, validationResult } = require("express-validator");
const { ValidationError, ForbiddenError } = require("../../lib/errors");
const {
  createGroup,
  getUserGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  createGroupInvite,
} = require("./groups.model");

const reqValidation = {
  handleCreateGroup: [
    body("name")
      .notEmpty()
      .withMessage("Group name is required")
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Group name must be between 2 and 50 characters"),

    body("description")
      .notEmpty()
      .withMessage("Group description is required")
      .trim()
      .isLength({ min: 2, max: 500 })
      .withMessage("Description must be between 2 and 500 characters"),

    body("type")
      .notEmpty()
      .withMessage("Group type is required")
      .trim()
      .isIn(["personal", "shared"])
      .withMessage("Group type must be either 'personal' or 'shared'"),
  ],
  handleUpdateGroup: [
    body("name")
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Group name must be between 2 and 50 characters"),

    body("description")
      .optional()
      .trim()
      .isLength({ min: 2, max: 500 })
      .withMessage("Description must be between 2 and 500 characters"),
  ],
  handleGetGroupById: [
    param("groupId")
      .notEmpty()
      .withMessage("Group ID is required")
      .isUUID()
      .withMessage("Group ID must be a valid UUID"),
  ],
};

// CREATE GROUP
const handleCreateGroup = [
  ...reqValidation.handleCreateGroup,

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError("Invalid group data", errors.array());
    }

    const { name, description, type } = req.body;
    const { id: userId } = req.user;

    const result = await createGroup(name, userId, description, type);

    res.status(201).json(result);
  },
];

// GET USER GROUPS
const handleGetUserGroups = async (req, res) => {
  const { id: userId } = req.user;

  const result = await getUserGroups(userId);

  res.status(200).json(result);
};

// GET GROUP BY ID
const handleGetGroupById = async (req, res) => {
  const { groupId } = req.params;

  const result = await getGroupById(groupId);

  res.status(200).json(result);
};

// UPDATE GROUP
const handleUpdateGroup = [
  ...reqValidation.handleUpdateGroup,

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

    res.status(200).json(result);
  },
];

// DELETE GROUP
const handleDeleteGroup = async (req, res) => {
  const { groupId } = req.params;

  const result = await deleteGroup(groupId);

  res.status(200).json(result);
};

const handleCreateGroupInvite = async (req, res) => {
  if (req.groupMembership.type !== "shared") {
    throw new ForbiddenError("Invites are only available for shared groups");
  }

  const result = await createGroupInvite(req.params.groupId, req.user.id);

  res.set("Cache-Control", "no-store");
  res.status(201).json(result);
};

module.exports = {
  handleCreateGroup,
  handleGetUserGroups,
  handleGetGroupById,
  handleUpdateGroup,
  handleDeleteGroup,
  handleCreateGroupInvite,
};
