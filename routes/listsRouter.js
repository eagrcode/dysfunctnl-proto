const { Router } = require("express");
const {
  getAllLists,
  createList,
  getListById,
  updateList,
  deleteList,
} = require("../controllers/listsController");

const listsRouter = Router({ mergeParams: true });

/* LIST ROUTES */

// Get all lists
listsRouter.get("/", getAllLists);

// Create a new list
listsRouter.post("/", createList);

// Get list by ID
listsRouter.get("/:listId", getListById);

// Update a list
listsRouter.patch("/:listId", updateList);

// Delete a list
listsRouter.delete("/:listId", deleteList);

/* LIST ITEM ROUTES */

// Get list items
listsRouter.get("/:listId/items", listItemsController.getListItems);

// Create a new list item
listsRouter.post("/:listId/items", listItemsController.createListItem);

// Update a list item
listsRouter.patch("/:listId/items/:itemId", listItemsController.updateListItem);

// Delete a list item
listsRouter.delete(
  "/:listId/items/:itemId",
  listItemsController.deleteListItem
);

// Toggle completion status of a list item
listsRouter.patch(
  "/:listId/items/:itemId/toggle",
  listItemsController.toggleComplete
);

module.exports = listsRouter;
