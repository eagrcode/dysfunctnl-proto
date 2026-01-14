const { Router } = require("express");
const permissionRequired = require("../../_shared/middleware/groupSecurity");
const {
  handleGetGroupMembers,
  handleAddUserToGroup,
  handleGetGroupMemberById,
  handleUpdateMemberRole,
  handleRemoveMemberFromGroup,
} = require("./members.controller");
const validateUUIDParams = require("../../_shared/middleware/validateUUID");

const membersRouter = Router({ mergeParams: true });

membersRouter.post("/", permissionRequired("admin"), handleAddUserToGroup);
membersRouter.get("/", handleGetGroupMembers);
membersRouter.get("/:userId", validateUUIDParams, handleGetGroupMemberById);
membersRouter.patch("/role", permissionRequired("admin"), handleUpdateMemberRole);
membersRouter.delete("/remove", permissionRequired("admin"), handleRemoveMemberFromGroup);

module.exports = membersRouter;
