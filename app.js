const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const { generalLimiter } = require("./_shared/middleware/rateLimiters");
const authRouter = require("./_features/auth/auth.router");
const groupsRouter = require("./_features/groups/groups.router");
const imageUploadCleanup = require("./_shared/middleware/imageUploadCleanup");
const { errorHandler } = require("./_shared/middleware/errorHandler");
const staticFileServeConfig = require("./_shared/utils/staticFileServeConfig");
const { NotFoundError } = require("./_shared/utils/errors");
const userRouter = require("./_features/user/user.router");
const authenticate = require("./_shared/middleware/auth");
const { getCorsOptions } = require("./_shared/utils/corsConfig");
const { logger } = require("./_shared/logger/logger");

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
app.use("/media", staticFileServeConfig);
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
