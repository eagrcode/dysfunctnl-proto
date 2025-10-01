const {
  handleCreateEvent,
  handleGetEventById,
  handleUpdateEvent,
  handleDeleteEvent,
  handleGetEventsByRange,
} = require("./calendar.controller");
const { Router } = require("express");

const calendarRouter = Router({ mergeParams: true });

/* CALENDAR ROUTES */
calendarRouter.post("/", handleCreateEvent);
calendarRouter.get("/:eventId", handleGetEventById);
calendarRouter.patch("/:eventId", handleUpdateEvent);
calendarRouter.delete("/:eventId", handleDeleteEvent);
calendarRouter.get("/range", handleGetEventsByRange);

module.exports = calendarRouter;
