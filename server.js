require("dotenv").config();

const { createServer } = require("http");
const { logger } = require("./_shared/logger/logger");
const { featureFlags } = require("./_shared/utils/featureFlags");
const { initSocketServer } = require("./_shared/utils/socketService");
const pool = require("./_shared/utils/db");

const useNeon = process.env.NODE_ENV === "production" || process.env.USE_NEON === "true";

const requiredEnvVars = [
  "JWT_SECRET",
  ...(useNeon ? ["DATABASE_URL"] : ["DB_HOST", "APP_USER", "DB_NAME", "APP_USER_PASSWORD"]),
  ...(featureFlags.mediaUploads ? ["UPLOAD_PATH"] : []),
];

const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
  logger.error("Missing required environment variables", { missingVars });
  process.exit(1);
}

const app = require("./app");
const port = Number(process.env.PORT || 3000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  logger.error("PORT must be an integer between 1 and 65535", {
    configuredPort: process.env.PORT,
  });
  process.exit(1);
}

const server = createServer(app);
initSocketServer(server);

server.listen(port, "0.0.0.0", () => {
  logger.info("Server started", {
    port,
    environment: process.env.NODE_ENV || "development",
    database: useNeon ? "Neon" : "local PostgreSQL",
    features: featureFlags,
  });

  pool
    .query(
      `
    SELECT
      current_database() AS database,
      current_user AS user
  `,
    )
    .then(({ rows }) => {
      logger.info("Connected to database", rows[0]);
    })
    .catch((error) => {
      logger.error("Database connection failed", { error });
    });
});
