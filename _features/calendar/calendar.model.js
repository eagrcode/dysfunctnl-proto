const pool = require("../../_shared/utils/db");
const { NotFoundError } = require("../../_shared/utils/errors");

// CREATE EVENT
const createEvent = async (
  groupId,
  createdBy,
  title,
  description = null,
  startTime,
  endTime,
  allDay = false,
  participants = [],
  location
) => {
  const result = await pool.query(
    `INSERT INTO calendar
        (group_id, created_by, title, description, start_time, end_time, all_day, participants, location)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [groupId, createdBy, title, description, startTime, endTime, allDay, participants, location]
  );

  return result.rows[0];
};

// GET EVENT BY ID
const getEventById = async (eventId, groupId) => {
  const result = await pool.query("SELECT * FROM calendar WHERE id = $1 AND group_id = $2", [
    eventId,
    groupId,
  ]);

  if (result.rows.length === 0) {
    throw new NotFoundError("Event not found");
  }

  return result.rows[0];
};

// GET EVENTS BY RANGE
const getEventsByRange = async (groupId, startTime, endTime) => {
  const result = await pool.query(
    `SELECT * FROM calendar
     WHERE group_id = $1
     AND start_time < $2
     AND end_time > $3
     ORDER BY start_time ASC`,
    [groupId, endTime, startTime]
  );

  return result.rows;
};

// UPDATE EVENT
const updateEvent = async (eventId, groupId, updates, is_admin, userId) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  // Dynamic query based on provided updates
  if (updates.title !== undefined) {
    fields.push(`title = $${paramIndex++}`);
    values.push(updates.title);
  }
  if (updates.description !== undefined) {
    fields.push(`description = $${paramIndex++}`);
    values.push(updates.description);
  }
  if (updates.startTime !== undefined) {
    fields.push(`start_time = $${paramIndex++}`);
    values.push(updates.startTime);
  }
  if (updates.endTime !== undefined) {
    fields.push(`end_time = $${paramIndex++}`);
    values.push(updates.endTime);
  }
  if (updates.allDay !== undefined) {
    fields.push(`all_day = $${paramIndex++}`);
    values.push(updates.allDay);
  }
  if (updates.participants !== undefined) {
    fields.push(`participants = $${paramIndex++}`);
    values.push(updates.participants);
  }
  if (updates.location !== undefined) {
    fields.push(`location = $${paramIndex++}`);
    values.push(updates.location);
  }

  // Add eventId and groupId as the final parameters
  values.push(eventId, groupId, userId, is_admin);

  const query = `
      UPDATE calendar 
      SET ${fields.join(", ")}
      WHERE id = $${paramIndex++} AND group_id = $${paramIndex++}
      AND (created_by = $${paramIndex++} OR $${paramIndex} = true)
      RETURNING *
    `;

  const result = await pool.query(query, values);

  if (result.rows.length === 0) {
    throw new NotFoundError("Event not found or no changes made");
  }

  return result.rows[0];
};

// DELETE EVENT
const deleteEvent = async (eventId, groupId, is_admin, userId) => {
  const result = await pool.query(
    `DELETE FROM calendar 
     WHERE id = $1 
     AND group_id = $2
     AND (created_by = $3 OR $4 = true) 
     RETURNING id, title`,
    [eventId, groupId, userId, is_admin]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError("Event not found");
  }

  return result.rows[0];
};

module.exports = {
  createEvent,
  getEventById,
  getEventsByRange,
  updateEvent,
  deleteEvent,
};
