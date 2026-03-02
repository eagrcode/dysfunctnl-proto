const jwt = require("jsonwebtoken");
const pool = require("../utils/db");

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ success: false, message: "Unauthorized", code: "UNAUTHORISED" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(401).json({ success: false, message: "Invalid token", code: "UNAUTHORISED" });

    // Just store basic user info - no groups needed here
    req.user = user;
    next();
  });
};

module.exports = authenticate;
