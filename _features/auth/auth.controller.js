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

const reqValidation = {
  handleUserRegistration: [
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
  ],
  handleUserLogin: [
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
  ],
};

// REGISTRATION
const handleUserRegistration = [
  ...reqValidation.handleUserRegistration,

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
  ...reqValidation.handleUserLogin,

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
      expiresIn: "4s",
    });
    const refreshToken = crypto.randomBytes(64).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

    await addRefreshToken(user.id, tokenHash);

    res.status(200).json({ user, accessToken, refreshToken });
  },
];

// REFRESH TOKEN
const handleRefreshAccessToken = async (req, res) => {
  const { refreshToken } = req.body;

  console.log("Received refresh token:", refreshToken ? refreshToken : null);

  if (!refreshToken) return res.status(401).json({ error: "Refresh token required" });

  const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

  const currentToken = await getRefreshToken(tokenHash);

  console.log("Current token from DB:", currentToken);

  if (!currentToken) {
    return res.status(403).json({ error: "Invalid or expired refresh token" });
  }

  const userId = currentToken.user_id;
  const newRefreshToken = crypto.randomBytes(64).toString("hex");
  const newTokenHash = crypto.createHash("sha256").update(newRefreshToken).digest("hex");
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });

  console.log(
    "Token match: updating to new refresh token for user ID:",
    userId,
    accessToken,
    newTokenHash
  );

  await addRefreshToken(userId, newTokenHash);

  res.json({ accessToken, refreshToken: newRefreshToken });
};

module.exports = {
  handleUserRegistration,
  handleUserLogin,
  handleRefreshAccessToken,
};
