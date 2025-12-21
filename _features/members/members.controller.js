const { body, validationResult } = require("express-validator");
const { ValidationError } = require("../../_shared/utils/errors");
const {
  getGroupMembers,
  getGroupMemberById,
  addUserToGroup,
  updateMemberRole,
  removeMemberFromGroup,
} = require("./members.model");

const reqValidation = {
  handleAddUserToGroup: [body("userIdToAdd").isUUID().withMessage("Invalid user ID format")],
  handleUpdateMemberRole: [body("isAdmin").isBoolean().withMessage("Invalid role format")],
  handleRemoveMemberFromGroup: [body("userId").isUUID().withMessage("Invalid user ID format")],
};

// GET ALL MEMBERS
const handleGetGroupMembers = async (req, res) => {
  const { groupId } = req.params;

  const result = await getGroupMembers(groupId);

  res.status(200).json({
    success: true,
    data: result,
  });
};
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
  ...reqValidation.handleAddUserToGroup,

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
  ...reqValidation.handleUpdateMemberRole,

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError("Validation failed", errors.array());
    }

    const { groupId } = req.params;
    const { userId } = req.body;
    const { isAdmin } = req.body;

    const result = await updateMemberRole(isAdmin, groupId, userId);

    res.status(200).json({
      success: true,
      data: result,
    });
  },
];

// REMOVE MEMBER FROM GROUP
const handleRemoveMemberFromGroup = [
  ...reqValidation.handleRemoveMemberFromGroup,

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
