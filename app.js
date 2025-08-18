const express = require("express");
const authRouter = require("./routes/authRouter");
const groupsRouter = require("./routes/groupsRouter");

const app = express();

app.use(express.json());

app.use("/auth", authRouter);
app.use("/groups", groupsRouter);

app.get("/", (req, res) => {
  res.send("Welcome to the Dysfunctnl Server!");
});

module.exports = app; // Export the app for testing purposes
