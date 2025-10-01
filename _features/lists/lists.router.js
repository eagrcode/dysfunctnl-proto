const { Router } = require("express");
const authenticate = require("../../middleware/auth");
const {
  handleGetAllLists,
  handleCreateList,
  handleGetListById,
  handleUpdateList,
  handleDeleteList,
} = require("../controllers/listsController");
const {
  handleGetListItems,
  handleCreateListItem,
  handleGetListItemById,
  handleUpdateListItem,
  handleToggleComplete,
  handleDeleteListItem,
} = require("../controllers/listItemsController");

const listsRouter = Router({ mergeParams: true });

/* LIST ROUTES */
listsRouter.get("/", authenticate, handleGetAllLists);
listsRouter.post("/", authenticate, handleCreateList);
listsRouter.get("/:listId", authenticate, handleGetListById);
listsRouter.patch("/:listId", authenticate, handleUpdateList);
listsRouter.delete("/:listId", authenticate, handleDeleteList);

/* LIST ITEM ROUTES */
// listsRouter.get("/:listId/items", handleGetListItems);
listsRouter.post("/:listId/items", handleCreateListItem);
listsRouter.get("/:listId/items/:itemId", handleGetListItemById);
listsRouter.patch("/:listId/items/:itemId", handleUpdateListItem);
listsRouter.delete("/:listId/items/:itemId", handleDeleteListItem);
listsRouter.patch("/:listId/items/:itemId/toggle", handleToggleComplete);

module.exports = listsRouter;
