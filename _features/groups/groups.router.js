/* GROUPS ROUTES */
const { Router } = require("express");
const membersRouter = require("../members/members.router");
const textChannelsRouter = require("../text-channels/textChannels.router");
const listsRouter = require("../lists/lists.router");
const calendarRouter = require("../calendar/calendar.router");
const authenticate = require("../../middleware/auth");
const permissionRequired = require("../../middleware/groupSecurity");
const {
  handleCreateGroup,
  handleGetGroupById,
  handleUpdateGroup,
  handleDeleteGroup,
} = require("../controllers/groupsController");

const groupsRouter = Router();

groupsRouter.post("/", authenticate, handleCreateGroup);
groupsRouter.get("/:groupId", authenticate, permissionRequired("member"), handleGetGroupById);
groupsRouter.patch("/:groupId", authenticate, permissionRequired("admin"), handleUpdateGroup);
groupsRouter.delete("/:groupId", authenticate, permissionRequired("creator"), handleDeleteGroup);

// Mount sibling routers
groupsRouter.use("/:groupId/members", membersRouter);
groupsRouter.use("/:groupId/text-channels", textChannelsRouter);
groupsRouter.use("/:groupId/lists", listsRouter);
groupsRouter.use("/:groupId/calendar", calendarRouter);

module.exports = groupsRouter;
