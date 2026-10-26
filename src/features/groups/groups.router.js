const {
  handleCreateGroup,
  handleGetUserGroups,
  handleGetGroupById,
  handleUpdateGroup,
  handleDeleteGroup,
  handleCreateGroupInvite,
} = require("./groups.controller");
const { Router } = require("express");
const listsRouter = require("../lists/lists.router");
const albumsRouter = require("../albums/albums.router");
const membersRouter = require("../members/members.router");
const calendarRouter = require("../calendar/calendar.router");
const dashboardRouter = require("../dashboard/dashboard.router");
const validateUUIDParams = require("../../http/middleware/validateUUID");
const { requireGroupAccess, requirePermissionLevel } = require("../../http/middleware/groupSecurity");
const textChannelsRouter = require("../text-channels/textChannels.router");

const groupsRouter = Router();

groupsRouter.post("/", handleCreateGroup);
groupsRouter.get("/", handleGetUserGroups);

// Apply base middleware to ALL group-context routes
groupsRouter.use("/:groupId", validateUUIDParams, requireGroupAccess());

// Routes with group context
groupsRouter.get("/:groupId", handleGetGroupById);
groupsRouter.patch("/:groupId", requirePermissionLevel("admin"), handleUpdateGroup);
groupsRouter.delete("/:groupId", requirePermissionLevel("creator"), handleDeleteGroup);
groupsRouter.post("/:groupId/invites", requirePermissionLevel("admin"), handleCreateGroupInvite);

// Mount child routers
groupsRouter.use("/:groupId/dashboard", dashboardRouter);
groupsRouter.use("/:groupId/members", membersRouter);
groupsRouter.use("/:groupId/text-channels", textChannelsRouter);
groupsRouter.use("/:groupId/lists", listsRouter);
groupsRouter.use("/:groupId/calendar", calendarRouter);
groupsRouter.use("/:groupId/albums", albumsRouter);

module.exports = groupsRouter;
