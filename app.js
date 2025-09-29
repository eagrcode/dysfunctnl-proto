const express = require("express");
const authRouter = require("./routes/authRouter");
const groupsRouter = require("./routes/groupsRouter");
const { errorHandler } = require("./middleware/errorHandler");

process.env.TZ = "UTC";
console.log("Server timezone:", process.env.TZ);
console.log("Node timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);

const app = express();

app.use(express.json());

app.use("/auth", authRouter);
app.use("/groups", groupsRouter);

app.get("/", (req, res) => {
  res.send("Welcome to the Dysfunctnl Server!");
});

app.use(errorHandler);

module.exports = app;
