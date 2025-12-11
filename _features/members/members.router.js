const { Router } = require("express");
const permissionRequired = require("../../_shared/middleware/groupSecurity");
const {
  handleGetGroupMembers,
  handleAddUserToGroup,
  handleGetGroupMemberById,
  handleUpdateMemberRole,
  handleRemoveMemberFromGroup,
} = require("./members.controller");

const membersRouter = Router({ mergeParams: true });

membersRouter.get("/", handleGetGroupMembers);
membersRouter.get("/:userId", handleGetGroupMemberById);
membersRouter.post("/add-member", permissionRequired("admin"), handleAddUserToGroup);
// membersRouter.patch("/:userId", permissionRequired("admin"), updateMember);
membersRouter.patch("/role", permissionRequired("admin"), handleUpdateMemberRole);
membersRouter.delete("/remove", permissionRequired("admin"), handleRemoveMemberFromGroup);

module.exports = membersRouter;
