const {
  handleCreateGroup,
  handleGetUserGroups,
  handleGetGroupById,
  handleUpdateGroup,
  handleDeleteGroup,
} = require("./groups.controller");
const { Router } = require("express");
const listsRouter = require("../lists/lists.router");
const albumsRouter = require("../albums/albums.router");
const membersRouter = require("../members/members.router");
const calendarRouter = require("../calendar/calendar.router");
const authenticate = require("../../_shared/middleware/auth");
const textChannelsRouter = require("../text-channels/textChannels.router");
const permissionRequired = require("../../_shared/middleware/groupSecurity");
const validateUUIDParams = require("../../_shared/middleware/validateUUID");

const groupsRouter = Router();

groupsRouter.post("/", authenticate, handleCreateGroup);
groupsRouter.get("/", authenticate, handleGetUserGroups);

// Apply base middleware to ALL group-context routes
groupsRouter.use("/:groupId", validateUUIDParams, authenticate, permissionRequired("member"));

// Routes with group context
groupsRouter.get("/:groupId", handleGetGroupById);
groupsRouter.patch("/:groupId", permissionRequired("admin"), handleUpdateGroup);
groupsRouter.delete("/:groupId", permissionRequired("creator"), handleDeleteGroup);

// Mount child routers
groupsRouter.use("/:groupId/members", membersRouter);
groupsRouter.use("/:groupId/text-channels", textChannelsRouter);
groupsRouter.use("/:groupId/lists", listsRouter);
groupsRouter.use("/:groupId/calendar", calendarRouter);
groupsRouter.use("/:groupId/albums", albumsRouter);

module.exports = groupsRouter;
