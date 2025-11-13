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
calendarRouter.get("/range", handleGetEventsByRange);
calendarRouter.post("/", handleCreateEvent);
calendarRouter.get("/:eventId", handleGetEventById);
calendarRouter.patch("/:eventId", handleUpdateEvent);
calendarRouter.delete("/:eventId", handleDeleteEvent);

module.exports = calendarRouter;
