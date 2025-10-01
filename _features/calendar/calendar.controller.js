const { body, validationResult, query } = require("express-validator");
const {
  createEvent,
  getEventById,
  updateEvent,
  deleteEvent,
  getEventsByRange,
} = require("./calendar.model");

const createAndUpdateValidationFields = [
  body("title")
    .notEmpty()
    .withMessage("Event title is required")
    .trim()
    .escape()
    .isLength({ min: 1, max: 100 })
    .withMessage("Title must be between 1 and 100 characters"),
  body("description")
    .optional()
    .trim()
    .escape()
    .isLength({ max: 500 })
    .withMessage("Description must not exceed 500 characters"),
  body("startTime")
    .notEmpty()
    .withMessage("Start time is required")
    .isISO8601()
    .withMessage("Start time must be a valid ISO 8601 date"),
  body("endTime")
    .notEmpty()
    .withMessage("End time is required")
    .isISO8601()
    .withMessage("End time must be a valid ISO 8601 date"),
  body("allDay").optional().isBoolean().withMessage("All day must be a boolean value").toBoolean(),
  body("participants")
    .optional()
    .isArray()
    .withMessage("Participants must be an array of user IDs"),
  body("location")
    .optional()
    .trim()
    .escape()
    .isLength({ max: 200 })
    .withMessage("Location must not exceed 200 characters"),
];
const eventsByRangeValidationFields = [
  query("startTime")
    .notEmpty()
    .withMessage("startTime query parameter is required")
    .isISO8601()
    .withMessage("startTime must be a valid ISO 8601 date"),
  query("endTime")
    .notEmpty()
    .withMessage("endTime query parameter is required")
    .isISO8601()
    .withMessage("endTime must be a valid ISO 8601 date"),
];

// CREATE EVENT
const handleCreateEvent = [
  ...createAndUpdateValidationFields,

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { groupId } = req.params;
    const {
      title,
      description = null,
      startTime,
      endTime,
      allDay = false,
      participants = [],
      location,
    } = req.body;

    const result = await createEvent(
      groupId,
      title,
      description,
      startTime,
      endTime,
      allDay,
      participants,
      location
    );

    res.status(201).json({
      success: true,
      data: result,
    });
  },
];

// GET EVENT BY ID
const handleGetEventById = async (req, res) => {
  const { groupId, eventId } = req.params;

  const result = await getEventById(eventId, groupId);

  res.status(200).json({
    success: true,
    data: result,
  });
};

// UPDATE EVENT
const handleUpdateEvent = [
  ...createAndUpdateValidationFields,

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { groupId, eventId } = req.params;
    const updates = req.body;

    const result = await updateEvent(eventId, groupId, updates);

    res.status(200).json({
      success: true,
      data: result,
    });
  },
];

// DELETE EVENT
const handleDeleteEvent = async (req, res) => {
  const { groupId, eventId } = req.params;

  const result = await deleteEvent(eventId, groupId);

  res.status(200).json({
    success: true,
    data: result,
  });
};

// GET EVENTS BY RANGE
const handleGetEventsByRange = [
  ...eventsByRangeValidationFields,

  async (req, res) => {
    const { groupId } = req.params;
    const { startTime, endTime } = req.query;

    if (!startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "Both startTime and endTime query parameters are required",
      });
    }

    const result = await getEventsByRange(groupId, startTime, endTime);

    res.status(200).json({
      success: true,
      data: result,
    });
  },
];

module.exports = {
  handleCreateEvent,
  handleGetEventById,
  handleUpdateEvent,
  handleDeleteEvent,
  handleGetEventsByRange,
};
