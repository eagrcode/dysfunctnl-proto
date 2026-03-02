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

process.env.TZ = "UTC";
console.log("Server timezone:", process.env.TZ);
console.log("Node timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",")
      : "*",
    credentials: true,
  }),
);
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
