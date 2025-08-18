const { Router } = require("express");
const {
  getAllLists,
  createList,
  getListById,
  updateList,
  deleteList,
} = require("../controllers/listsController");

const listsRouter = Router({ mergeParams: true });

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

module.exports = listsRouter;
