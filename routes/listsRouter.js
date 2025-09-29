const { Router } = require("express");
const authenticate = require("../middleware/auth");
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

// Get all lists
listsRouter.get("/", authenticate, handleGetAllLists);

// Create a new list
listsRouter.post("/", authenticate, handleCreateList);

// Get list by ID
listsRouter.get("/:listId", authenticate, handleGetListById);

// Update a list
listsRouter.patch("/:listId", authenticate, handleUpdateList);

// Delete a list
listsRouter.delete("/:listId", authenticate, handleDeleteList);

/* LIST ITEM ROUTES */

// Get list items
listsRouter.get("/:listId/items", handleGetListItems);

// Create a new list item
listsRouter.post("/:listId/items", handleCreateListItem);

// Get a list item by ID
listsRouter.get("/:listId/items/:itemId", handleGetListItemById);

// Update a list item
listsRouter.patch("/:listId/items/:itemId", handleUpdateListItem);

// Delete a list item
listsRouter.delete("/:listId/items/:itemId", handleDeleteListItem);

// Toggle completion status of a list item
listsRouter.patch("/:listId/items/:itemId/toggle", handleToggleComplete);

module.exports = listsRouter;
