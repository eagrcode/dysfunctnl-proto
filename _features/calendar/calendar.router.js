const {
  handleCreateEvent,
  handleGetEventById,
  handleUpdateEvent,
  handleDeleteEvent,
  handleGetEventsByRange,
} = require("./calendar.controller");
const { Router } = require("express");
const checkEventOwnership = require("../../_shared/middleware/eventSecurity");

const calendarRouter = Router({ mergeParams: true });

/* CALENDAR ROUTES */
calendarRouter.get("/range", handleGetEventsByRange);
calendarRouter.post("/", handleCreateEvent);
calendarRouter.get("/:eventId", handleGetEventById);
calendarRouter.patch("/:eventId", checkEventOwnership, handleUpdateEvent);
calendarRouter.delete("/:eventId", checkEventOwnership, handleDeleteEvent);

module.exports = calendarRouter;
