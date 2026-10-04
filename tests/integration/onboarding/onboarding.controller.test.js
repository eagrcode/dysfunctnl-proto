const request = require("supertest");
const jwt = require("jsonwebtoken");
const { randomUUID, randomBytes } = require("node:crypto");

// Each test registers fresh users. Rate limiting has its own tests and would stop fixture setup.
jest.mock("../../../src/http/middleware/rateLimiters", () => {
  const nextRequest = (req, res, next) => next();

  return {
    generalLimiter: nextRequest,
    authLimiter: nextRequest,
    registrationLimiter: nextRequest,
    uploadLimiter: nextRequest,
  };
});

const app = require("../../../src/app");
const pool = require("../../../src/db/pool");
const { handleRedeemCode } = require("../../../src/features/onboarding/onboarding.controller");
const { registerUser, loginUser, createGroup, addMember } = require("../../helpers/test-setup");

jest.setTimeout(20000);

describe("Onboarding API Tests - Redeem Invite Code", () => {
  let userEmails;
  let groupCreatorId;
  let groupCreatorAccessToken;
  let userId;
  let accessToken;
  let groupId;
  let inviteId;
  let inviteCode;

  const groupData = {
    name: "Onboarding Test Group",
    description: "Test group for invite redemption",
  };

  // Track the email before registration so cleanup also works if setup fails partway through.
  const createTestUser = async () => {
    const email = `onboarding-${randomUUID()}@register.com`;
    userEmails.push(email);

    const registeredUser = await registerUser(email);
    const { accessToken } = await loginUser(email);

    return { userId: registeredUser.userId, accessToken };
  };

  const redeemInvite = (body = { code: inviteCode }, token = accessToken) => {
    const testRequest = request(app)
      .post("/onboarding/join-group")
      .send(body)
      .set("Content-Type", "application/json");

    return token ? testRequest.set("Authorization", `Bearer ${token}`) : testRequest;
  };

  // Read the stored state as well as the response, so partial writes cannot go unnoticed.
  const getInviteState = async () => {
    const invite = await pool.query("SELECT used_at, used_by FROM group_invites WHERE id = $1", [
      inviteId,
    ]);
    const members = await pool.query(
      "SELECT user_id FROM group_members WHERE group_id = $1 ORDER BY user_id",
      [groupId],
    );
    const roles = await pool.query(
      "SELECT user_id, is_admin FROM group_members_roles WHERE group_id = $1 ORDER BY user_id",
      [groupId],
    );

    return { invite: invite.rows[0], members: members.rows, roles: roles.rows };
  };

  const expectRedeemed = async (redeemingUserId) => {
    const state = await getInviteState();

    expect(state.invite).toEqual({ used_at: expect.any(Date), used_by: redeemingUserId });
    expect(state.members).toHaveLength(2);
    expect(state.members).toContainEqual({ user_id: redeemingUserId });
    expect(state.roles).toHaveLength(2);
    expect(state.roles).toContainEqual({ user_id: redeemingUserId, is_admin: false });
    expect(state.roles).toContainEqual({ user_id: groupCreatorId, is_admin: true });
  };

  // Initial setup: Register and login two users, create a group, and seed an unused invite.
  beforeEach(async () => {
    userEmails = [];
    groupId = undefined;
    inviteId = undefined;

    const creator = await createTestUser();
    groupCreatorId = creator.userId;
    groupCreatorAccessToken = creator.accessToken;

    const joiningUser = await createTestUser();
    userId = joiningUser.userId;
    accessToken = joiningUser.accessToken;

    groupId = await createGroup(groupData, groupCreatorAccessToken);
    inviteCode = randomBytes(3).toString("hex").toUpperCase();

    // There is no invite-creation endpoint yet, so only invite fixtures are inserted directly.
    const result = await pool.query(
      `INSERT INTO group_invites (group_id, invited_by, invite_type)
       VALUES ($1, $2, 'code') RETURNING id`,
      [groupId, groupCreatorId],
    );
    inviteId = result.rows[0].id;

    await pool.query("INSERT INTO group_invite_codes (group_invite_id, code) VALUES ($1, $2)", [
      inviteId,
      inviteCode,
    ]);
  });

  // Cleanup after EVERY test, including failed assertions and partially completed setup.
  afterEach(async () => {
    jest.restoreAllMocks();

    // These test users own all fixtures. Foreign keys cascade to their groups, invites,
    // memberships, roles and refresh tokens. Never delete unrelated users or truncate tables.
    await pool.query("DELETE FROM users WHERE email = ANY($1::text[])", [userEmails]);

    const remainingUsers = await pool.query("SELECT id FROM users WHERE email = ANY($1::text[])", [
      userEmails,
    ]);
    expect(remainingUsers.rows).toEqual([]);

    if (groupId) {
      const remainingGroup = await pool.query("SELECT id FROM groups WHERE id = $1", [groupId]);
      expect(remainingGroup.rows).toEqual([]);
    }

    if (inviteId) {
      const remainingInvite = await pool.query("SELECT id FROM group_invites WHERE id = $1", [
        inviteId,
      ]);
      expect(remainingInvite.rows).toEqual([]);
    }
  });

  afterAll(async () => {
    await pool.end();
  });

  // AUTHENTICATION
  describe("Authentication", () => {
    test("should reject a direct controller call without an authenticated user", async () => {
      const before = await getInviteState();
      const req = { body: { code: inviteCode } };
      const validators = handleRedeemCode.slice(0, -1);
      const handleRequest = handleRedeemCode[handleRedeemCode.length - 1];

      // The mounted auth middleware normally rejects this first. Exercise the defensive guard.
      for (const validator of validators) {
        await validator.run(req);
      }

      await expect(handleRequest(req, {})).rejects.toMatchObject({
        statusCode: 401,
        code: "UNAUTHORISED",
        message: "User not authenticated",
      });
      expect(await getInviteState()).toEqual(before);
    });

    test.each([
      { condition: "missing", token: () => null, code: "ACCESS_TOKEN_MISSING" },
      { condition: "invalid", token: () => "not-a-valid-jwt", code: "ACCESS_TOKEN_INVALID" },
      {
        condition: "expired",
        token: () => jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: -60 }),
        code: "ACCESS_TOKEN_EXPIRED",
      },
      {
        condition: "signed with another secret",
        token: () => jwt.sign({ id: userId }, "onboarding-wrong-secret"),
        code: "ACCESS_TOKEN_INVALID",
      },
    ])("should reject a $condition access token", async ({ token, code }) => {
      const before = await getInviteState();

      const response = await redeemInvite({ code: inviteCode }, token());

      expect(response.status).toBe(401);
      expect(response.body.code).toBe(code);
      expect(await getInviteState()).toEqual(before);
    });
  });

  // VALIDATE INVITE CODE
  describe("Validate Invite Code", () => {
    test.each([
      { condition: "missing", body: {} },
      { condition: "empty", body: { code: "" } },
      { condition: "too short", body: { code: "ABC12" } },
      { condition: "too long", body: { code: "ABC1234" } },
      { condition: "null", body: { code: null } },
      { condition: "numeric", body: { code: 123456 } },
      { condition: "boolean", body: { code: true } },
      { condition: "an array", body: { code: ["ABC123"] } },
      { condition: "an object", body: { code: { value: "ABC123" } } },
    ])("should reject a code that is $condition", async ({ body }) => {
      const before = await getInviteState();

      const response = await redeemInvite(body);

      expect(response.status).toBe(400);
      expect(response.body.code).toBe("VALIDATION_ERROR");
      expect(response.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "code" })]),
      );
      expect(await getInviteState()).toEqual(before);
    });

    // The current validator accepts any six-character string. These cannot match stored codes.
    test.each([
      { condition: "unknown", code: "------" },
      { condition: "lowercase", code: "abcdef" },
      { condition: "whitespace", code: "      " },
      { condition: "SQL-like input", code: "'OR1=1" },
    ])("should reject a $condition code without changing the database", async ({ code }) => {
      const before = await getInviteState();

      const response = await redeemInvite({ code });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ code: "NOT_FOUND", message: "Invalid invite code" });
      expect(await getInviteState()).toEqual(before);
    });
  });

  // REDEEM INVITE
  describe("Redeem Invite", () => {
    test("should add the authenticated user as a non-admin and mark the invite used", async () => {
      // A body-supplied user ID must not replace the authenticated user's ID.
      const response = await redeemInvite({ code: inviteCode, userId: groupCreatorId });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ inviteRedeemed: true, groupId, userId });
      await expectRedeemed(userId);
    });

    test("should reject an expired invite", async () => {
      await pool.query(
        `UPDATE group_invites
         SET created_at = now() - interval '2 days', expires_at = now() - interval '1 day'
         WHERE id = $1`,
        [inviteId],
      );
      const before = await getInviteState();

      const response = await redeemInvite();

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Invalid group invite");
      expect(await getInviteState()).toEqual(before);
    });

    test("should reject an invite that has already been used", async () => {
      await pool.query("UPDATE group_invites SET used_at = now(), used_by = $1 WHERE id = $2", [
        groupCreatorId,
        inviteId,
      ]);
      const before = await getInviteState();

      const response = await redeemInvite();

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Invalid group invite");
      expect(await getInviteState()).toEqual(before);
    });

    test("should reject a deleted invite", async () => {
      await pool.query("DELETE FROM group_invites WHERE id = $1", [inviteId]);
      const before = await getInviteState();

      const response = await redeemInvite();

      // Deleting the invite also deletes its code through the foreign key.
      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Invalid invite code");
      expect(await getInviteState()).toEqual(before);
    });

    test.each([
      { role: "group creator", token: () => groupCreatorAccessToken },
      { role: "existing member", token: () => accessToken },
    ])("should reject the $role without consuming the invite", async ({ role, token }) => {
      if (role === "existing member") {
        const result = await addMember(groupId, userId, groupCreatorAccessToken);
        expect(result.role.is_admin).toBe(false);
      }
      const before = await getInviteState();

      const response = await redeemInvite({ code: inviteCode }, token());

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        code: "CONFLICT",
        message: "User is already a member of this group",
      });
      expect(await getInviteState()).toEqual(before);
    });

    test.each(["same user", "another user"])("should reject reuse by the %s", async (condition) => {
      const firstResponse = await redeemInvite();
      expect(firstResponse.status).toBe(200);
      const before = await getInviteState();
      const token = condition === "same user" ? accessToken : (await createTestUser()).accessToken;

      const response = await redeemInvite({ code: inviteCode }, token);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Invalid group invite");
      expect(await getInviteState()).toEqual(before);
    });
  });

  // CONCURRENT REDEMPTION
  describe("Concurrent Redemption", () => {
    test.each(["same user", "different users"])(
      "should redeem only once for the %s",
      async (condition) => {
        const secondUser =
          condition === "same user" ? { userId, accessToken } : await createTestUser();

        const responses = await Promise.all([
          redeemInvite(),
          redeemInvite({ code: inviteCode }, secondUser.accessToken),
        ]);

        expect(responses.map((response) => response.status).sort()).toEqual([200, 404]);
        const successfulResponse = responses.find((response) => response.status === 200);
        const rejectedResponse = responses.find((response) => response.status === 404);

        expect([userId, secondUser.userId]).toContain(successfulResponse.body.userId);
        expect(rejectedResponse.body.message).toBe("Invalid group invite");
        await expectRedeemed(successfulResponse.body.userId);
      },
    );
  });

  // DATABASE FAILURES AND ROLLBACK
  describe("Database Failures and Rollback", () => {
    // Fail one operation on the next real transaction. All other SQL, including rollback,
    // still runs against PostgreSQL. Restore spies before inspecting the stored state.
    const interceptQuery = (pattern, replacement) => {
      const connect = pool.connect.bind(pool);

      jest.spyOn(pool, "connect").mockImplementationOnce(async () => {
        const client = await connect();
        const query = client.query.bind(client);

        jest.spyOn(client, "query").mockImplementation(async (sql, values) => {
          if (pattern.test(sql)) {
            return replacement(query, sql, values);
          }

          return query(sql, values);
        });

        return client;
      });
    };

    test.each([
      { condition: "finding the code", pattern: /from group_invite_codes/i },
      { condition: "locking the invite", pattern: /select group_id\s+from group_invites/i },
      { condition: "checking membership", pattern: /select 1 from group_members/i },
      { condition: "inserting membership", pattern: /insert into group_members\s/i },
      { condition: "inserting the role", pattern: /insert into group_members_roles/i },
      { condition: "marking the invite used", pattern: /update group_invites/i },
      { condition: "committing the transaction", pattern: /^COMMIT$/ },
    ])("should roll back when $condition fails and allow a retry", async ({ pattern }) => {
      const before = await getInviteState();
      interceptQuery(pattern, () => {
        throw new Error("Private database failure details");
      });

      const response = await redeemInvite();
      jest.restoreAllMocks();

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      });
      expect(await getInviteState()).toEqual(before);

      const retryResponse = await redeemInvite();
      expect(retryResponse.status).toBe(200);
      await expectRedeemed(userId);
    });

    test.each([
      {
        condition: "membership insert returns no member",
        pattern: /insert into group_members\s/i,
        message: "Failed to add user to the group",
      },
      {
        condition: "invite update affects no rows",
        pattern: /update group_invites/i,
        message: "Failed to update invite status",
      },
    ])("should roll back when the $condition", async ({ pattern, message }) => {
      const before = await getInviteState();
      interceptQuery(pattern, async (query, sql, values) => {
        await query(sql, values);
        return { rows: [], rowCount: 0 };
      });

      const response = await redeemInvite();
      jest.restoreAllMocks();

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ code: "NOT_FOUND", message });
      expect(await getInviteState()).toEqual(before);
    });

    test("should return a server error when a database connection cannot be acquired", async () => {
      const before = await getInviteState();
      jest.spyOn(pool, "connect").mockRejectedValueOnce(new Error("Connection unavailable"));

      const response = await redeemInvite();
      jest.restoreAllMocks();

      expect(response.status).toBe(500);
      expect(response.body.code).toBe("INTERNAL_ERROR");
      expect(await getInviteState()).toEqual(before);
    });
  });
});
