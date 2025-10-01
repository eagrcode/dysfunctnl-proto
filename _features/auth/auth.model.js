const pool = require("../../shared/utils/db");

// REGISTRATION
const registration = async (email, password_hash, first_name, last_name) => {
  const result = await pool.query(
    "INSERT INTO users (email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4) RETURNING *",
    [email, password_hash, first_name, last_name]
  );

  return result.rows[0];
};

// LOGIN
const login = async (email) => {
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);

  return result.rows[0];
};

// CHECK IF CURRENT REFRESH TOKEN
const getRefreshToken = async (userId) => {
  const result = await pool.query(
    "SELECT token_hash from refresh_tokens WHERE user_id = $1",
    [userId]
  );

  return result.rows[0];
};

// UPDATE EXISTING REFRESH TOKEN
const updateRefreshToken = async (userId, tokenHash) => {
  const result = await pool.query(
    "UPDATE refresh_tokens SET token_hash = $1 WHERE user_id = $2 RETURNING *",
    [tokenHash, userId]
  );

  return result.rows[0];
};

// ADD REFRESH TOKEN
const addRefreshToken = async (userId, tokenHash) => {
  const result = await pool.query(
    "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3) RETURNING *",
    [userId, tokenHash, null]
  );

  return result.rows[0];
};

module.exports = {
  registration,
  login,
  getRefreshToken,
  updateRefreshToken,
  addRefreshToken,
};
