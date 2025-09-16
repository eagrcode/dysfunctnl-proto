const { body, param, validationResult } = require("express-validator");
const { ValidationError } = require("../utils/errors");
const {
  getGroupMembers,
  getGroupMemberById,
  addUserToGroup,
  updateMemberRole,
  removeMemberFromGroup,
} = require("../models/membersModel");

// GET ALL MEMBERS
const handleGetGroupMembers = [
  async (req, res) => {
    const { groupId } = req.params;

    try {
      const result = await getGroupMembers(groupId);

      res.status(200).json({
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
const handleGetGroupMemberById = async (req, res) => {
  const { groupId } = req.params;
  const { userId } = req.params;

  const result = await getGroupMemberById(groupId, userId);

  res.status(200).json({
    success: true,
    data: result,
  });
};

// ADD USER TO GROUP
const handleAddUserToGroup = [
  body("userIdToAdd").isUUID().withMessage("Invalid user ID format"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError("Validation failed", errors.array());
    }

    const { groupId } = req.params;
    const { userIdToAdd } = req.body;

    const result = await addUserToGroup(groupId, userIdToAdd);
    res.status(201).json({
      success: true,
      data: result,
    });
  },
];

// UPDATE MEMBER ROLE
const handleUpdateMemberRole = [
  body("userId").isUUID().withMessage("Invalid user ID format"),
  body("isAdmin").isBoolean().withMessage("Invalid role format"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError("Validation failed", errors.array());
    }

    const { groupId } = req.params;
    const { userId } = req.body;
    const { isAdmin } = req.body;

    const result = await updateMemberRole(isAdmin, groupId, userId);

    res.status(201).json({
      success: true,
      data: result,
    });
  },
];

// REMOVE MEMBER FROM GROUP
const handleRemoveMemberFromGroup = [
  body("userId").isUUID().withMessage("Invalid user ID format"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError("Validation failed", errors.array());
    }

    const { groupId } = req.params;
    const { userId } = req.body;

    const result = await removeMemberFromGroup(groupId, userId);
    res.status(200).json({
      success: true,
      data: result,
    });
  },
];

module.exports = {
  handleGetGroupMembers,
  handleGetGroupMemberById,
  handleAddUserToGroup,
  handleUpdateMemberRole,
  handleRemoveMemberFromGroup,
};
