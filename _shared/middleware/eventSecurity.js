const { NotFoundError, ForbiddenError } = require("../utils/errors");
const pool = require("../utils/db");

const checkEventOwnership = async (req, res, next) => {
  const { eventId, groupId } = req.params;
  const { id: userId } = req.user;

  console.log(
    `\n→ Checking if user ${userId} is the creator of event ${eventId} in group ${groupId}...`
  );

  const eventCreatorId = await getEventCreatorId(eventId, groupId);

  console.log(`Event created by user ${eventCreatorId}`);

  if (eventCreatorId !== userId) {
    throw new ForbiddenError("You are not the creator of this event");
  }

  console.log("User is the creator of the event.");
  next();
};

const getEventCreatorId = async (eventId, groupId) => {
  const result = await pool.query(
    "SELECT created_by FROM calendar WHERE id = $1 AND group_id = $2",
    [eventId, groupId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError("Event not found");
  }

  return result.rows[0].created_by;
};

module.exports = checkEventOwnership;
