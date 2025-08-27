const { Router } = require("express");
const permissionRequired = require("../middleware/groupSecurity");
const authenticate = require("../middleware/auth");
const {
  handleGetGroupMembers,
  handleAddUserToGroup,
  handleGetGroupMemberById,
  handleUpdateMemberRole,
  handleRemoveMemberFromGroup,
} = require("../controllers/membersController");

const membersRouter = Router({ mergeParams: true });

// GET ALL MEMBERS
membersRouter.get(
  "/",
  authenticate,
  permissionRequired("member"),
  handleGetGroupMembers
);

// GET MEMBER BY ID
membersRouter.get(
  "/:userId",
  authenticate,
  permissionRequired("member"),
  handleGetGroupMemberById
);

// ADD MEMBER
membersRouter.post(
  "/add-member",
  authenticate,
  permissionRequired("admin"),
  handleAddUserToGroup
);

// UPDATE MEMBER
// membersRouter.patch("/:userId", authenticate, permissionRequired("admin"), updateMember);

// UPDATE MEMBER ROLE
membersRouter.patch(
  "/:userId/role",
  authenticate,
  permissionRequired("admin"),
  handleUpdateMemberRole
);

// DELETE MEMBER
membersRouter.delete(
  "/:userId",
  authenticate,
  permissionRequired("admin"),
  handleRemoveMemberFromGroup
);

module.exports = membersRouter;
