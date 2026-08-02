require("dotenv").config();

const { createServer } = require("http");
const { initSocketServer } = require("./_shared/utils/socketService");
const pool = require("./_shared/utils/db");

const useNeon = process.env.NODE_ENV === "production" || process.env.USE_NEON === "true";

const requiredEnvVars = [
  "JWT_SECRET",
  ...(useNeon ? ["DATABASE_URL"] : ["DB_HOST", "APP_USER", "DB_NAME", "APP_USER_PASSWORD"]),
];

const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
  console.error("Missing environment variables:", missingVars.join(", "));
  process.exit(1);
}

const app = require("./app");
const port = Number(process.env.PORT || 3000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error("PORT must be an integer between 1 and 65535");
  process.exit(1);
}

const server = createServer(app);
initSocketServer(server);

server.listen(port, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(
    `Environment: ${process.env.NODE_ENV || "development"} ${useNeon ? "(Using Neon)" : "(Using Local DB)"}`,
  );

  pool
    .query(
      `
    SELECT
      current_database() AS database,
      current_user AS user
  `,
    )
    .then(({ rows }) => {
      console.log("Connected to database:", rows[0]);
    })
    .catch((error) => {
      console.error("Database connection failed:", error);
    });
});
