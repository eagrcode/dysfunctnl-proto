const dotenv = require("dotenv");
const { createServer } = require("http");
const { initSocketServer } = require("./_shared/utils/socketService");
const pool = require("./_shared/utils/db");

dotenv.config();

const requiredEnvVars = [
  "DB_HOST",
  "APP_USER",
  "DB_NAME",
  "APP_USER_PASSWORD",
  "JWT_SECRET",
  "DATABASE_URL",
];

const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
  console.error("Missing environment variables:", missingVars.join(", "));
  process.exit(1);
}

const app = require("./app");
const port = 3000;

const server = createServer(app);
initSocketServer(server);

server.listen(port, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(
    `Environment: ${process.env.NODE_ENV} ${process.env.USE_NEON === "true" ? "(Using Neon)" : "(Using Local DB)"}`,
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
