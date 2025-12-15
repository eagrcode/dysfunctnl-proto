const {
  handleCreateEvent,
  handleGetEventById,
  handleUpdateEvent,
  handleDeleteEvent,
  handleGetEventsByRange,
} = require("./calendar.controller");
const { Router } = require("express");
const validateUUIDParams = require("../../_shared/middleware/validateUUID");

const calendarRouter = Router({ mergeParams: true });

calendarRouter.use("/:eventId", validateUUIDParams);

/* CALENDAR ROUTES */
calendarRouter.post("/", handleCreateEvent);
calendarRouter.get("/range", handleGetEventsByRange);
calendarRouter.get("/:eventId", handleGetEventById);
calendarRouter.patch("/:eventId", handleUpdateEvent);
calendarRouter.delete("/:eventId", handleDeleteEvent);

module.exports = calendarRouter;
