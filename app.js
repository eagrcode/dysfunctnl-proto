const express = require("express");
const { generalLimiter } = require("./_shared/middleware/rateLimiters");
const authRouter = require("./_features/auth/auth.router");
const groupsRouter = require("./_features/groups/groups.router");
const imageUploadCleanup = require("./_shared/middleware/imageUploadCleanup");
const { errorHandler } = require("./_shared/middleware/errorHandler");

process.env.TZ = "UTC";
console.log("Server timezone:", process.env.TZ);
console.log("Node timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);

const app = express();

app.use(express.json());
app.use(generalLimiter);

app.use("/auth", authRouter);
app.use("/groups", groupsRouter);

app.get("/", (req, res) => {
  res.send("Welcome to the Dysfunctnl Server!");
});

app.use(imageUploadCleanup);
app.use(errorHandler);

module.exports = app;
