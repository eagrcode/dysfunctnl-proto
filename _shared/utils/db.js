const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config();

const useNeon = process.env.NODE_ENV === "production" || process.env.USE_NEON === "true";

const pool = new Pool(
  useNeon
    ? {
        connectionString: process.env.DATABASE_URL,
      }
    : {
        host: process.env.DB_HOST,
        user: process.env.APP_USER,
        database: process.env.DB_NAME,
        password: process.env.APP_USER_PASSWORD,
        port: Number(process.env.DB_PORT || 5432),
      },
);

module.exports = pool;
