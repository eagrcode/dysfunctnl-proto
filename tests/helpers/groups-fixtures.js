const { randomUUID } = require("node:crypto");
const jwt = require("jsonwebtoken");
const request = require("supertest");

require("dotenv").config({ quiet: true });

// Check the target before importing the app or opening database connections.
if (
  process.env.NODE_ENV !== "test" ||
  process.env.USE_NEON === "true" ||
  !["localhost", "127.0.0.1", "::1"].includes(process.env.DB_HOST)
) {
  throw new Error("Group integration tests require NODE_ENV=test and a local PostgreSQL database.");
}

if (!process.env.JWT_SECRET) {
  throw new Error("Group integration tests require JWT_SECRET in the server environment.");
}

const pool = require("../../src/db/pool");
const app = require("../../src/app");

pool.options.connectionTimeoutMillis = 3000;

const groupData = (type = "shared") => ({
  name: type === "personal" ? "Personal space" : "Shared group",
  description: "Group integration test fixture",
  type,
});

const authorised = (httpRequest, user) =>
  httpRequest.set("Authorization", `Bearer ${user.accessToken}`);

const verifyGroupDatabase = async () => {
  const { rows } = await pool.query(`
    SELECT
      to_regclass('public.groups_one_personal_per_owner') IS NOT NULL AS personal_index,
      (
        SELECT COUNT(*) = 2
        FROM pg_constraint
        WHERE conrelid = 'public.group_members'::regclass
          AND conname IN ('group_members_shared_type_check', 'group_members_shared_group_fkey')
          AND convalidated
      ) AS shared_members_only
  `);

  if (!rows[0].personal_index || !rows[0].shared_members_only) {
    throw new Error("Apply the Personal group database constraints before running the group tests.");
  }
};

const createGroupsFixtures = () => {
  const userIds = [];

  const createUser = async () => {
    // Password login is outside this suite. Insert a real user and sign a token
    // so requests still pass through the actual authentication middleware.
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [`groups-${randomUUID()}@example.com`, "not-a-login-password-hash", "Group", "Test"],
    );
    const id = rows[0].id;
    userIds.push(id);

    return { id, accessToken: jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "5m" }) };
  };

  const createGroup = async (user, type = "shared", overrides = {}) => {
    const response = await authorised(request(app).post("/groups"), user).send({
      ...groupData(type),
      ...overrides,
    });

    if (response.status !== 201) {
      throw new Error(`Group fixture creation failed: ${response.status} ${response.body.message}`);
    }

    return response.body;
  };

  const addMember = async (groupId, user, isAdmin = false) => {
    await pool.query("INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)", [groupId, user.id]);
    await pool.query(
      "INSERT INTO group_members_roles (group_id, user_id, is_admin) VALUES ($1, $2, $3)",
      [groupId, user.id, isAdmin],
    );
  };

  const cleanup = async () => {
    // Only this fixture's users are removed. Foreign keys cascade removal of
    // their groups, memberships, and roles, including after a failed test.
    if (userIds.length > 0) {
      await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [userIds]);
      userIds.length = 0;
    }
  };

  return { createUser, createGroup, addMember, cleanup };
};

module.exports = { app, pool, groupData, authorised, verifyGroupDatabase, createGroupsFixtures };
