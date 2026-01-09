const pool = require("../../_shared/utils/db");

// GET USER PROFILE
const getUserProfile = async (userId) => {
  const query = `
    SELECT * FROM users
    WHERE id = $1
  `;

  const result = await pool.query(query, [userId]);

  return result.rows[0];
};

// UPDATE USER PROFILE
const updateUserProfile = async (userId, profileData) => {
  const fields = [];
  const values = [];
  let index = 1;

  if (profileData.firstName) {
    fields.push(`first_name = $${index++}`);
    values.push(profileData.username);
  }
  if (profileData.lastName) {
    fields.push(`last_name = $${index++}`);
    values.push(profileData.lastName);
  }
  if (profileData.email) {
    fields.push(`email = $${index++}`);
    values.push(profileData.email);
  }

  if (fields.length === 0) {
    throw new Error("No valid fields to update");
  }

  const query = `
        UPDATE users
        SET ${fields.join(", ")}
        WHERE id = $${index}
        RETURNING *
    `;

  values.push(userId);

  const result = await pool.query(query, values);

  return result.rows[0];
};

// DELETE USER ACCOUNT
const deleteUserAccount = async (userId) => {
  const query = `
    DELETE FROM users
    WHERE id = $1
    RETURNING id
  `;

  await pool.query(query, [userId]);
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  deleteUserAccount,
};
