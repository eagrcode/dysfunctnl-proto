const pool = require("../db");

const escapeLiteral = (str) => {
  return "'" + (str ? str.toString().replace(/'/g, "''") : "") + "'";
};

const setRlsContext = async (userId, queryFn) => {
  console.log("Setting RLS context for user ID:", userId);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Safely interpolate the escaped userId
    const escapedUserId = escapeLiteral(userId);
    console.log("Escaped userId for SET:", escapedUserId);

    await client.query(`SET LOCAL app.current_user_id = ${escapedUserId}`);

    // Check if setting was applied
    const settingResult = await client.query(
      "SELECT current_setting('app.current_user_id')"
    );
    const currentSetting = settingResult.rows[0].current_setting;

    if (currentSetting !== userId) {
      throw new Error(
        `Failed to set RLS context: expected ${userId}, got ${currentSetting}`
      );
    }
    console.log("RLS context set successfully:", currentSetting);

    // Run the query function and pass client
    const result = await queryFn(client);
    await client.query("COMMIT");

    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = setRlsContext;
