const { body, param, validationResult } = require("express-validator");
const {
  createGroup,
  getGroupById,
  updateGroup,
  deleteGroup,
} = require("../models/groupsModel");

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
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description } = req.body;
    const { id: userId } = req.user;

    try {
      const result = await createGroup(name, userId, description);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Group creation failed:", {
        userId,
        name,
        description,
        error: error.message,
        stack: error.stack,
        code: error.code,
      });

      res.status(500).json({
        error: "An unexpected error occurred while creating the group",
      });
    }
  },
];

// GET GROUP BY ID
const handleGetGroupById = [
  // Validation against invalid group requests is handled in /middleware/groupSecurity.js
  async (req, res) => {
    const { groupId } = req.params;

    try {
      const result = await getGroupById(groupId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Get group by ID failed:", {
        groupId: groupId,
        error: error.message,
        stack: error.stack,
        code: error.code,
      });

      res.status(500).json({
        error: "An unexpected error occurred while fetching the group",
      });
    }
  },
];

// UPDATE GROUP
const handleUpdateGroup = [
  // Validate and sanitise optional fields
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
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { groupId } = req.params;
    const updates = {};

    // Only include fields that were provided
    if (req.body.name !== undefined) {
      updates.name = req.body.name;
    }
    if (req.body.description !== undefined) {
      updates.description = req.body.description;
    }

    try {
      const result = await updateGroup(updates, groupId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Update group failed:", {
        groupId: groupId,
        error: error.message,
        stack: error.stack,
        code: error.code,
      });

      res.status(500).json({
        error: "An unexpected error occured while updating the group",
      });
    }
  },
];

// DELETE GROUP
const handleDeleteGroup = [
  async (req, res) => {
    const { groupId } = req.params;

    try {
      const result = await deleteGroup(groupId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Delete group failed:", {
        groupId: groupId,
        error: error.message,
        stack: error.stack,
        code: error.code,
      });

      res.status(500).json({
        error:
          "An unexpected error occured while attempting to delete this group",
      });
    }
  },
];

module.exports = {
  handleCreateGroup,
  handleGetGroupById,
  handleUpdateGroup,
  handleDeleteGroup,
};
