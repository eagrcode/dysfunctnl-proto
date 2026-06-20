const pool = require("../../_shared/utils/db");
const { NotFoundError } = require("../../_shared/utils/errors");
const customConsoleLog = require("../../_shared/utils/customConsoleLog");

// REGISTRATION
const registration = async (email, password_hash, first_name, last_name) => {
  const result = await pool.query(
    "INSERT INTO users (email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4) RETURNING id, email, first_name, last_name",
    [email, password_hash, first_name, last_name],
  );

  return result.rows[0];
};

// LOGIN
const login = async (email) => {
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

  return result.rows[0];
};

// CHECK IF CURRENT REFRESH TOKEN
const getRefreshToken = async (tokenHash) => {
  const query = `
    SELECT user_id, token_hash 
    FROM refresh_tokens
    WHERE token_hash = $1
    AND expires_at > NOW()
  `;

  const result = await pool.query(query, [tokenHash]);

  if (result.rows.length === 0) {
    throw new NotFoundError("Refresh token not found");
  }

  return result.rows[0];
};

// ADD REFRESH TOKEN
const addRefreshToken = async (userId, tokenHash) => {
  customConsoleLog("Adding refresh token...", userId);
  const query = `
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
    VALUES (
      $1, 
      $2, 
      now() + interval '30 days'
    )
    ON CONFLICT (user_id)
    DO UPDATE SET 
      token_hash = EXCLUDED.token_hash,
      expires_at = EXCLUDED.expires_at,
      updated_at = now()
    RETURNING token_hash, expires_at, updated_at
  `;

  const result = await pool.query(query, [userId, tokenHash]);

  return result.rows[0];
};

module.exports = {
  registration,
  login,
  getRefreshToken,
  addRefreshToken,
};
