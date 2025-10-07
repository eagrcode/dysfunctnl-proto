const { Router } = require("express");
const permissionRequired = require("../../middleware/groupSecurity");
const {
  handleGetGroupMembers,
  handleAddUserToGroup,
  handleGetGroupMemberById,
  handleUpdateMemberRole,
  handleRemoveMemberFromGroup,
} = require("./members.controller");

const membersRouter = Router({ mergeParams: true });

// GET ALL MEMBERS
membersRouter.get("/", handleGetGroupMembers);

// GET MEMBER BY ID
membersRouter.get("/:userId", handleGetGroupMemberById);

// ADD MEMBER
membersRouter.post("/add-member", permissionRequired("admin"), handleAddUserToGroup);

// UPDATE MEMBER
// membersRouter.patch("/:userId", permissionRequired("admin"), updateMember);

// UPDATE MEMBER ROLE
membersRouter.patch("/role", permissionRequired("admin"), handleUpdateMemberRole);

// DELETE MEMBER
membersRouter.delete("/remove", permissionRequired("admin"), handleRemoveMemberFromGroup);

module.exports = membersRouter;
