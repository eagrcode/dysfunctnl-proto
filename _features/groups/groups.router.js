/* GROUPS ROUTES */
const { Router } = require("express");
const membersRouter = require("../members/members.router");
const textChannelsRouter = require("../text-channels/textChannels.router");
const listsRouter = require("../lists/lists.router");
const calendarRouter = require("../calendar/calendar.router");
const albumsRouter = require("../albums/albums.router");
const authenticate = require("../../middleware/auth");
const permissionRequired = require("../../middleware/groupSecurity");
const {
  handleCreateGroup,
  handleGetGroupById,
  handleUpdateGroup,
  handleDeleteGroup,
} = require("../controllers/groupsController");

const groupsRouter = Router();

// Routes without group context
groupsRouter.post("/", authenticate, handleCreateGroup);

// Apply base middleware to ALL group-context routes
groupsRouter.use("/:groupId", authenticate, permissionRequired("member"));

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
