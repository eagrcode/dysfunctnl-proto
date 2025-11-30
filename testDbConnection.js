const pool = require("./_shared/utils/db");

async function testConnection() {
  let client;
  try {
    client = await pool.connect();
    console.log("Connection to PostgreSQL DB successful!");
    console.log("Connection details:", {
      host: client.host,
      port: client.port,
      database: client.database,
      user: client.user,
    });
  } catch (err) {
    console.error("Connection error:", err.stack);
  } finally {
    if (client) {
      client.release();
    }
  }
}

testConnection();
