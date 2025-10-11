const { Router } = require("express");
const {
  handleGetAllLists,
  handleCreateList,
  handleGetListById,
  handleUpdateList,
  handleDeleteList,
} = require("./lists.controller");
const {
  handleGetListItems,
  handleCreateListItem,
  handleGetListItemById,
  handleUpdateListItem,
  handleToggleComplete,
  handleDeleteListItem,
} = require("./list-items/listItems.controller");

const listsRouter = Router({ mergeParams: true });

/* LIST ROUTES */
listsRouter.get("/", handleGetAllLists);
listsRouter.post("/", handleCreateList);
listsRouter.get("/:listId", handleGetListById);
listsRouter.patch("/:listId", handleUpdateList);
listsRouter.delete("/:listId", handleDeleteList);

/* LIST ITEM ROUTES */
// listsRouter.get("/:listId/items", handleGetListItems);
listsRouter.post("/:listId/items", handleCreateListItem);
listsRouter.get("/:listId/items/:itemId", handleGetListItemById);
listsRouter.patch("/:listId/items/:itemId", handleUpdateListItem);
listsRouter.delete("/:listId/items/:itemId", handleDeleteListItem);
listsRouter.patch("/:listId/items/:itemId/toggle", handleToggleComplete);

module.exports = listsRouter;
