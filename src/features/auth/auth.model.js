const pool = require("../../db/pool");
const { logger } = require("../../lib/logger");

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

// ADD REFRESH TOKEN
const addRefreshToken = async (userId, tokenHash) => {
  logger.debug(`Adding refresh token:`, { userId });

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
    RETURNING expires_at, updated_at
  `;

  const result = await pool.query(query, [userId, tokenHash]);

  return result.rows[0];
};

// ROTATE REFRESH TOKEN
const rotateRefreshToken = async (currentTokenHash, newTokenHash) => {
  const query = `
    UPDATE refresh_tokens
    SET
      token_hash = $2,
      expires_at = now() + interval '30 days',
      updated_at = now()
    WHERE token_hash = $1
      AND expires_at > now()
    RETURNING user_id, expires_at, updated_at
  `;

  const result = await pool.query(query, [currentTokenHash, newTokenHash]);

  return result.rows[0] ?? null;
};

module.exports = {
  registration,
  login,
  rotateRefreshToken,
  addRefreshToken,
};
