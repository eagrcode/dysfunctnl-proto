const dotenv = require("dotenv");
const { createServer } = require("http");
const { initSocketServer } = require("./_shared/utils/socketService");

dotenv.config();

const requiredEnvVars = ["HOST", "APPUSER", "DATABASE", "APP_USER_PASSWORD", "JWT_SECRET"];

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
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
