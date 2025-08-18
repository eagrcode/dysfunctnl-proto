const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config();

module.exports = new Pool({
  host: process.env.HOST,
  user: process.env.APPUSER,
  database: process.env.DATABASE,
  password: process.env.APP_USER_PASSWORD,
  port: process.env.PORT,
});
