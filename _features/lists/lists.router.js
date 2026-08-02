const { Router } = require("express");
const {
  handleGetAllLists,
  handleCreateList,
  handleGetListById,
  handleDeleteList,
  handleRenameList,
} = require("./lists.controller");
const {
  handleCreateListItem,
  handleGetListItemById,
  handleUpdateListItem,
  handleToggleComplete,
  handleToggleCompleteAll,
  handleDeleteListItems,
} = require("./list-items/listItems.controller");
const validateUUIDParams = require("../../_shared/middleware/validateUUID");

const listsRouter = Router({ mergeParams: true });

listsRouter.use("/:listId", validateUUIDParams);

/* LIST ROUTES */
listsRouter.get("/", handleGetAllLists);
listsRouter.post("/", handleCreateList);
listsRouter.get("/:listId", handleGetListById);
listsRouter.patch("/:listId", handleRenameList);
listsRouter.delete("/:listId", handleDeleteList);

/* LIST ITEM ROUTES */
listsRouter.post("/:listId/items", handleCreateListItem);
listsRouter.delete("/:listId/items/delete", handleDeleteListItems);
listsRouter.patch("/:listId/items/toggle-all", handleToggleCompleteAll);

listsRouter.use("/:listId/items/:itemId", validateUUIDParams);

listsRouter.get("/:listId/items/:itemId", handleGetListItemById);
listsRouter.patch("/:listId/items/:itemId", handleUpdateListItem);
listsRouter.patch("/:listId/items/:itemId/toggle", handleToggleComplete);

module.exports = listsRouter;
