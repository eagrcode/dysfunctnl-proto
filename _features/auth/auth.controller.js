const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const pool = require("../../_shared/utils/db");
const { body, validationResult } = require("express-validator");
const { logger } = require("../../_shared/logger/logger");
const { login, addRefreshToken, rotateRefreshToken, registration } = require("./auth.model");

const {
  AUTH_CODES,
  ValidationError,
  UnauthorisedError,
  ConflictError,
} = require("../../_shared/utils/errors");

const DUMMY_HASH = bcrypt.hashSync("dummy", 10);

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

    body("password").notEmpty().withMessage("Password is required").trim().escape(),
  ],
};

// REGISTRATION
const handleUserRegistration = [
  ...reqValidation.handleUserRegistration,

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError("Validation failed", errors.array());
    }

    const { email, password, first_name, last_name } = req.body;

    const password_hash = await bcrypt.hash(password, 10);

    try {
      const result = await registration(email, password_hash, first_name, last_name);

      const accessToken = jwt.sign({ id: result.id }, process.env.JWT_SECRET, {
        expiresIn: "15m",
      });
      const refreshToken = crypto.randomBytes(64).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

      const tokenRes = await addRefreshToken(result.id, tokenHash);

      if (!tokenRes) {
        throw new Error("Failed to add refresh token");
      }

      const authResponse = {
        user: {
          id: result.id,
          email: result.email,
          first_name: result.first_name,
          last_name: result.last_name,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      };

      return res.status(201).json({ success: true, data: authResponse });
    } catch (err) {
      const isEmailConflict = err.code === "23505" && err.constraint === "users_email_key";

      if (isEmailConflict) {
        throw new ConflictError("Email already exists", AUTH_CODES.EMAIL_ALREADY_EXISTS);
      }
      throw err;
    }
  },
];

// LOGIN
const handleUserLogin = [
  ...reqValidation.handleUserLogin,

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError("Validation failed", errors.array());
    }

    const { email, password } = req.body;

    const user = await login(email);
    const isValid = await bcrypt.compare(password, user?.password_hash || DUMMY_HASH);

    if (!user || !isValid) {
      throw new UnauthorisedError("Invalid credentials");
    }

    const accessToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });
    const refreshToken = crypto.randomBytes(64).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

    await addRefreshToken(user.id, tokenHash);

    const authResponse = {
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    };

    res.status(200).json({ success: true, data: authResponse });
  },
];

// REFRESH TOKEN
const handleRefreshAccessToken = async (req, res) => {
  const { refreshToken } = req.body ?? {};

  if (refreshToken == null || refreshToken === "") {
    throw new UnauthorisedError("Refresh token required", AUTH_CODES.REFRESH_TOKEN_REQUIRED);
  }

  if (typeof refreshToken !== "string" || !/^[0-9a-f]{128}$/.test(refreshToken)) {
    throw new UnauthorisedError(
      "Invalid or expired refresh token",
      AUTH_CODES.REFRESH_TOKEN_INVALID,
    );
  }

  const currentTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  const newRefreshToken = crypto.randomBytes(64).toString("hex");
  const newTokenHash = crypto.createHash("sha256").update(newRefreshToken).digest("hex");
  const rotatedToken = await rotateRefreshToken(currentTokenHash, newTokenHash);

  if (!rotatedToken) {
    throw new UnauthorisedError(
      "Invalid or expired refresh token",
      AUTH_CODES.REFRESH_TOKEN_INVALID,
    );
  }

  const accessToken = jwt.sign({ id: rotatedToken.user_id }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });

  res.status(200).json({
    accessToken,
    refreshToken: newRefreshToken,
  });
};

module.exports = {
  handleUserRegistration,
  handleUserLogin,
  handleRefreshAccessToken,
};
