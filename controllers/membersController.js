const { body, param, validationResult } = require("express-validator");
const {
  getGroupMembers,
  getGroupMemberById,
  addUserToGroup,
  updateMemberRole,
  removeMemberFromGroup,
} = require("../models/membersModel");

// GET ALL MEMBERS
const handleGetGroupMembers = [
  param("groupId").isUUID().withMessage("Invalid group ID format"),

  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { groupId } = req.params;

    try {
      const result = await getGroupMembers(groupId);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Get all group members failed:", {
        groupId: groupId,
        error: error.message,
        stack: error.stack,
        code: error.code,
      });

      res.status(500).json({
        error: "An unexpected error occured while fetching group members",
      });
    }
  },
];

// GET MEMBER BY ID
const handleGetGroupMemberById = [
  param("groupId").isUUID().withMessage("Invalid group ID format"),
  body("userId").isUUID().withMessage("Invalid user ID format"),

  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { groupId } = req.params;
    const { userId } = req.body;

    try {
      const result = await getGroupMemberById(groupId, userId);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Get all group member by id failed:", {
        groupId: groupId,
        userId: userId,
        error: error.message,
        stack: error.stack,
        code: error.code,
      });

      res.status(500).json({
        error: "An unexpected error occured while fetching the group member",
      });
    }
  },
];

// ADD USER TO GROUP
const handleAddUserToGroup = [
  param("groupId").isUUID().withMessage("Invalid group ID format"),
  body("userIdToAdd").isUUID().withMessage("Invalid user ID format"),

  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { groupId } = req.params;
    const { userIdToAdd } = req.body;

    try {
      const result = await addUserToGroup(groupId, userIdToAdd);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Add user to group failed:", {
        userIdToAdd: userIdToAdd,
        groupId: groupId,
        error: error.message,
        stack: error.stack,
        code: error.code,
      });

      res.status(500).json({
        error: "An unexpected error occured while adding the user to the group",
      });
    }
  },
];

// UPDATE MEMBER ROLE
const handleUpdateMemberRole = [
  param("groupId").isUUID().withMessage("Invalid group ID format"),
  body("userId").isUUID().withMessage("Invalid user ID format"),
  body("isAdmin").isBoolean().withMessage("Invalid role format"),

  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { groupId } = req.params;
    const { userId } = req.body;
    const { isAdmin } = req.body;

    try {
      const result = await updateMemberRole(isAdmin, groupId, userId);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Update user role failed:", {
        userId: userId,
        groupId: groupId,
        isAdmin: isAdmin,
        error: error.message,
        stack: error.stack,
        code: error.code,
      });

      res.status(500).json({
        error: "An unexpected error occured while updating the users role",
      });
    }
  },
];

const handleRemoveMemberFromGroup = [
  param("groupId").isUUID().withMessage("Invalid group ID format"),
  body("userId").isUUID().withMessage("Invalid user ID format"),

  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { groupId } = req.params;
    const { userId } = req.body;

    try {
      const result = await removeMemberFromGroup(groupId, userId);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Remove group member failed:", {
        groupId: groupId,
        userId: userId,
        error: error.message,
        stack: error.stack,
        code: error.code,
      });

      res.status(500).json({
        error: "An unexpected error occured while removing the group member",
      });
    }
  },
];

module.exports = {
  handleGetGroupMembers,
  handleGetGroupMemberById,
  handleAddUserToGroup,
  handleUpdateMemberRole,
  handleRemoveMemberFromGroup,
};
