const pool = require("./shared/utils/db");

async function testConnection() {
  let client;
  try {
    client = await pool.connect();
    console.log("Connection to PostgreSQL DB successful!");
  } catch (err) {
    console.error("Connection error:", err.stack);
  } finally {
    if (client) {
      client.release();
    }
  }
}

testConnection();
