const { Router } = require("express");
const { requirePermissionLevel } = require("../../http/middleware/groupSecurity");
const {
  handleGetGroupMembers,
  handleAddUserToGroup,
  handleGetGroupMemberById,
  handleUpdateMemberRole,
  handleRemoveMemberFromGroup,
} = require("./members.controller");
const validateUUIDParams = require("../../http/middleware/validateUUID");

const membersRouter = Router({ mergeParams: true });

membersRouter.post("/", requirePermissionLevel("admin"), handleAddUserToGroup);
membersRouter.get("/", handleGetGroupMembers);
membersRouter.get("/:userId", validateUUIDParams, handleGetGroupMemberById);
membersRouter.patch("/role", requirePermissionLevel("admin"), handleUpdateMemberRole);
membersRouter.delete("/remove", requirePermissionLevel("admin"), handleRemoveMemberFromGroup);

module.exports = membersRouter;
