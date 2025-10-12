const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const pool = require("../../_shared/utils/db");
const { body, validationResult } = require("express-validator");
const {
  login,
  getRefreshToken,
  updateRefreshToken,
  addRefreshToken,
  registration,
} = require("./auth.model");

// REGISTRATION
const handleUserRegistration = [
  body("email")
    .notEmpty()
    .withMessage("Email address is required")
    .trim()
    .escape()
    .isEmail()
    .withMessage("Invalid email address"),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .trim()
    .escape()
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long"),

  body("first_name")
    .notEmpty()
    .withMessage("First name is required")
    .trim()
    .escape()
    .isLength({ min: 1, max: 30 })
    .withMessage("First name must be between 1 and 30 characters"),

  body("last_name")
    .notEmpty()
    .withMessage("Last name is required")
    .trim()
    .escape()
    .isLength({ min: 1, max: 30 })
    .withMessage("Last name must be between 1 and 30 characters"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, first_name, last_name } = req.body;

    const password_hash = await bcrypt.hash(password, 10);

    const result = await registration(email, password_hash, first_name, last_name);

    res.status(201).json(result);
  },
];

// LOGIN
const handleUserLogin = [
  body("email")
    .notEmpty()
    .withMessage("Email address is required")
    .trim()
    .escape()
    .isEmail()
    .withMessage("Invalid email address"),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .trim()
    .escape()
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await login(email);

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const accessToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });

    const existingToken = await getRefreshToken(user.id);

    const refreshToken = crypto.randomBytes(64).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

    if (!existingToken) {
      console.log("No existing refresh token...creating a new one");
      await addRefreshToken(user.id, tokenHash);
    } else {
      console.log("Refresh token exists...updating");
      await updateRefreshToken(user.id, tokenHash);
    }

    res.status(200).json({ user, accessToken, refreshToken });
  },
];

// REFRESH TOKEN
const handleRefreshAccessToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) return res.status(401).json({ error: "Refresh token required" });

  const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

  try {
    const result = await pool.query("SELECT * FROM refresh_tokens WHERE token_hash = $1", [
      tokenHash,
    ]);
    const stored = result.rows[0];

    if (!stored) {
      return res.status(403).json({ error: "Invalid or expired refresh token" });
    }

    const accessToken = jwt.sign({ id: stored.user_id }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });

    res.json({ accessToken });
  } catch (error) {
    res.status(500).json({ error: "Refresh failed: " + error.message });
  }
};

module.exports = {
  handleUserRegistration,
  handleUserLogin,
  handleRefreshAccessToken,
};
