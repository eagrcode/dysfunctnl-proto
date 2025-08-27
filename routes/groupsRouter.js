/* GROUPS ROUTES */
const { Router } = require("express");
const membersRouter = require("./membersRouter");
const textChannelsRouter = require("./textChannelsRouter");
const listsRouter = require("./listsRouter");
const authenticate = require("../middleware/auth");
const permissionRequired = require("../middleware/groupSecurity");
const {
  handleCreateGroup,
  handleGetGroupById,
  handleUpdateGroup,
  handleDeleteGroup,
  handleAddUserToGroup,
} = require("../controllers/groupsController");

const groupsRouter = Router();

// Create a new group
groupsRouter.post("/", authenticate, handleCreateGroup);

// Get a specific group by ID
groupsRouter.get(
  "/:groupId",
  authenticate,
  permissionRequired("member"),
  handleGetGroupById
);

// Update a group
groupsRouter.patch(
  "/:groupId",
  authenticate,
  permissionRequired("admin"),
  handleUpdateGroup
);

// Delete a group
groupsRouter.delete(
  "/:groupId",
  authenticate,
  permissionRequired("creator"),
  handleDeleteGroup
);

// Mount sibling routers
groupsRouter.use("/:groupId/members", membersRouter);
groupsRouter.use("/:groupId/text-channels", textChannelsRouter);
groupsRouter.use("/:groupId/lists", listsRouter);

module.exports = groupsRouter;
