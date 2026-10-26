const { randomUUID } = require("node:crypto");
const crypto = require("node:crypto");
const request = require("supertest");
const {
  app, pool, authorised, verifyGroupDatabase, createGroupsFixtures,
} = require("../../helpers/groups-fixtures");

jest.setTimeout(15000);

describe("Group invite creation", () => {
  let fixtures;
  let users;
  let group;

  beforeAll(verifyGroupDatabase);

  beforeEach(async () => {
    fixtures = createGroupsFixtures();
    users = {};
    for (const role of ["creator", "admin", "member", "outsider"]) {
      users[role] = await fixtures.createUser();
    }
    group = await fixtures.createGroup(users.creator);
    await fixtures.addMember(group.id, users.admin, true);
    await fixtures.addMember(group.id, users.member);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await fixtures?.cleanup();
  });

  afterAll(async () => {
    await pool.end();
  });

  const createInvite = (user = users.creator, groupId = group.id, body = {}) =>
    authorised(request(app).post(`/groups/${groupId}/invites`), user).send(body);

  const storedInvites = async () => {
    const result = await pool.query(
      `SELECT gi.id, gi.invited_by, gi.invite_type, gi.created_at, gi.expires_at,
              gi.used_at, gi.used_by, gic.code
       FROM group_invites gi
       LEFT JOIN group_invite_codes gic ON gic.group_invite_id = gi.id
       WHERE gi.group_id = $1 ORDER BY gi.id`,
      [group.id],
    );
    return result.rows;
  };

  test.each(["creator", "admin"])("%s creates a persisted invite using the database expiry", async (role) => {
    const response = await createInvite(users[role], group.id, {
      invited_by: users.outsider.id,
      code: "HACKED",
      expires_at: "2099-01-01",
    });

    expect(response.status).toBe(201);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body).toEqual({
      id: expect.any(String),
      code: expect.stringMatching(/^\d{6}$/),
      expires_at: expect.any(String),
    });
    const invites = await storedInvites();
    expect(invites).toHaveLength(1);
    expect(invites[0]).toMatchObject({
      id: response.body.id,
      code: response.body.code,
      invited_by: users[role].id,
      invite_type: "code",
      used_at: null,
      used_by: null,
    });
    expect(invites[0].expires_at.toISOString()).toBe(response.body.expires_at);
    expect(invites[0].expires_at - invites[0].created_at).toBe(7 * 24 * 60 * 60 * 1000);
  });

  test.each([["member", 403], ["outsider", 404]])("%s cannot create an invite", async (role, status) => {
    const response = await createInvite(users[role]);

    expect(response.status).toBe(status);
    expect(await storedInvites()).toEqual([]);
  });

  test.each([undefined, "invalid-token"])("requires a valid access token (%s)", async (token) => {
    const httpRequest = request(app).post(`/groups/${group.id}/invites`);
    if (token) httpRequest.set("Authorization", `Bearer ${token}`);

    expect((await httpRequest).status).toBe(401);
    expect(await storedInvites()).toEqual([]);
  });

  test.each([["invalid", 400], [randomUUID(), 404]])("rejects group ID %s", async (groupId, status) => {
    expect((await createInvite(users.creator, groupId)).status).toBe(status);
    expect(await storedInvites()).toEqual([]);
  });

  test("rejects invites to a personal space", async () => {
    const personal = await fixtures.createGroup(users.creator, "personal");
    const response = await createInvite(users.creator, personal.id);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Invites are only available for shared groups");
    const result = await pool.query("SELECT id FROM group_invites WHERE group_id = $1", [personal.id]);
    expect(result.rows).toEqual([]);
  });

  test("each generated code can independently invite one person through the existing redemption endpoint", async () => {
    const secondJoiner = await fixtures.createUser();
    const first = await createInvite();
    const second = await createInvite();

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.code).not.toBe(second.body.code);
    expect(await storedInvites()).toHaveLength(2);

    const redeem = (code, user) =>
      authorised(request(app).post("/onboarding/join-group"), user).send({ code });
    const redeemedFirst = await redeem(first.body.code, users.outsider);
    expect(redeemedFirst.status).toBe(200);
    expect(redeemedFirst.body).toMatchObject({
      inviteRedeemed: true, groupId: group.id, onboarded: true,
    });

    const remaining = (await storedInvites()).find((invite) => invite.id === second.body.id);
    expect(remaining).toMatchObject({ used_at: null, used_by: null });
    expect((await redeem(second.body.code, secondJoiner)).status).toBe(200);
    expect((await redeem(first.body.code, secondJoiner)).status).toBe(404);
    const roles = await pool.query(
      "SELECT is_admin FROM group_members_roles WHERE group_id = $1 AND user_id = ANY($2::uuid[])",
      [group.id, [users.outsider.id, secondJoiner.id]],
    );
    expect(roles.rows).toEqual([{ is_admin: false }, { is_admin: false }]);
  });

  test("an already onboarded user can redeem an invite without losing existing memberships", async () => {
    await pool.query("UPDATE users SET onboarded = true WHERE id = $1", [users.outsider.id]);
    const existingGroup = await fixtures.createGroup(users.outsider);
    const invite = await createInvite();

    const response = await authorised(
      request(app).post("/onboarding/join-group"), users.outsider,
    ).send({ code: invite.body.code });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ groupId: group.id, onboarded: true });
    const { rows } = await pool.query(
      "SELECT group_id FROM group_members WHERE user_id = $1", [users.outsider.id],
    );
    expect(rows).toEqual(expect.arrayContaining([
      { group_id: existingGroup.id }, { group_id: group.id },
    ]));
  });

  test("preserves leading zeroes and retries a code collision without leaving an extra invite", async () => {
    const { rows } = await pool.query(
      `SELECT lpad(candidate::text, 6, '0') AS code
       FROM generate_series(0, 9999) AS candidate
       WHERE NOT EXISTS (
         SELECT 1 FROM group_invite_codes WHERE code = lpad(candidate::text, 6, '0')
       ) LIMIT 1`,
    );
    const random = jest.spyOn(crypto, "randomInt").mockReturnValueOnce(Number(rows[0].code));
    const first = await createInvite();
    expect(first.status).toBe(201);
    expect(first.body.code).toBe(rows[0].code);
    expect(first.body.code).toMatch(/^00\d{4}$/);

    random.mockReturnValueOnce(Number(first.body.code));
    const second = await createInvite();

    expect(second.status).toBe(201);
    expect(second.body.code).not.toBe(first.body.code);
    expect(random.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(await storedInvites()).toHaveLength(2);
  });

  test("rolls back the new invite after exhausting collision retries and preserves previous invites", async () => {
    const first = await createInvite();
    expect(first.status).toBe(201);
    const before = await storedInvites();
    jest.spyOn(crypto, "randomInt").mockReturnValue(Number(first.body.code));

    const response = await createInvite();

    expect(response.status).toBe(409);
    expect(await storedInvites()).toEqual(before);
  });

  test("rolls back both records if code insertion fails and allows a later retry", async () => {
    const connect = pool.connect.bind(pool);
    jest.spyOn(pool, "connect").mockImplementation((...args) => {
      // pool.query uses the callback form during group access checks.
      if (args.length > 0) return connect(...args);

      return (async () => {
        const client = await connect();
        const query = client.query.bind(client);
        jest.spyOn(client, "query").mockImplementation(async (sql, values) => {
          const result = await query(sql, values);
          if (/insert into group_invite_codes/i.test(sql)) {
            throw new Error("Simulated invite code persistence failure");
          }
          return result;
        });
        return client;
      })();
    });

    const response = await createInvite();
    jest.restoreAllMocks();

    expect(response.status).toBe(500);
    expect(await storedInvites()).toEqual([]);
    expect((await createInvite()).status).toBe(201);
    expect(await storedInvites()).toHaveLength(1);
  });
});
