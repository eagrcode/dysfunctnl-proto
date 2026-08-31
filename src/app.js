const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const { generalLimiter } = require("./http/middleware/rateLimiters");
const authRouter = require("./features/auth/auth.router");
const groupsRouter = require("./features/groups/groups.router");
const imageUploadCleanup = require("./http/middleware/imageUploadCleanup");
const { errorHandler } = require("./http/middleware/errorHandler");
const { NotFoundError } = require("./lib/errors");
const userRouter = require("./features/users/user.router");
const authenticate = require("./http/middleware/auth");
const { getCorsOptions } = require("./config/cors-config");
const { featureFlags } = require("./config/feature-flags");
const { logger } = require("./lib/logger");

process.env.TZ = "UTC";
logger.info("Server timezone configured", {
  timezone: process.env.TZ,
  resolvedTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
});

const app = express();

if (process.env.TRUST_PROXY) {
  app.set("trust proxy", process.env.TRUST_PROXY);
}

app.use(helmet());
app.use(cors(getCorsOptions()));
app.use(express.json({ limit: "10kb" }));
app.use(generalLimiter);

if (featureFlags.mediaUploads) {
  const staticFileServeConfig = require("./http/static-file-serve-config");
  app.use("/media", staticFileServeConfig);
}

app.use("/auth", authRouter);
app.use("/users", authenticate, userRouter);
app.use("/groups", groupsRouter);

app.get("/", (req, res) => {
  res.send("Welcome to the Dysfunctnl Server!");
});

// 404 handler
app.use((req, res) => {
  throw new NotFoundError("Endpoint not found");
});

app.use(imageUploadCleanup);
app.use(errorHandler);

module.exports = app;
