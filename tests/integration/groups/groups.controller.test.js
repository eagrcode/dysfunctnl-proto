const { randomUUID } = require("node:crypto");
const request = require("supertest");
const {
  app, pool, groupData, authorised, verifyGroupDatabase, createGroupsFixtures,
} = require("../../helpers/groups-fixtures");

jest.setTimeout(15000);

describe("Groups controller integration", () => {
  let fixtures;
  let owner;

  beforeAll(verifyGroupDatabase);

  beforeEach(async () => {
    fixtures = createGroupsFixtures();
    owner = await fixtures.createUser();
  });

  afterEach(async () => {
    await fixtures?.cleanup();
  });

  afterAll(async () => {
    await pool.end();
  });

  const getStoredGroup = async (id) => {
    const { rows } = await pool.query("SELECT * FROM groups WHERE id = $1", [id]);
    return rows[0];
  };

  describe("POST /groups", () => {
    test("creates a shared group with its creator membership and admin role", async () => {
      const response = await authorised(request(app).post("/groups"), owner).send(groupData());

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        ...groupData(),
        id: expect.any(String),
        created_by: owner.id,
        created_at: expect.any(String),
      });
      expect(await getStoredGroup(response.body.id)).toMatchObject({
        ...groupData(), created_by: owner.id,
      });

      const members = await pool.query("SELECT * FROM group_members WHERE group_id = $1", [response.body.id]);
      const roles = await pool.query("SELECT * FROM group_members_roles WHERE group_id = $1", [response.body.id]);
      expect(members.rows).toEqual([
        expect.objectContaining({ user_id: owner.id, group_id: response.body.id, group_type: "shared" }),
      ]);
      expect(roles.rows).toEqual([
        expect.objectContaining({ user_id: owner.id, group_id: response.body.id, is_admin: true }),
      ]);
    });

    test("creates a Personal group without a membership or role", async () => {
      const response = await authorised(request(app).post("/groups"), owner).send(groupData("personal"));

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ ...groupData("personal"), created_by: owner.id });
      expect(await getStoredGroup(response.body.id)).toMatchObject({
        type: "personal", created_by: owner.id,
      });

      const members = await pool.query("SELECT * FROM group_members WHERE group_id = $1", [response.body.id]);
      const roles = await pool.query("SELECT * FROM group_members_roles WHERE group_id = $1", [response.body.id]);
      expect(members.rows).toEqual([]);
      expect(roles.rows).toEqual([]);
    });

    test("returns 409 for a second Personal group and preserves the existing group", async () => {
      const existing = await fixtures.createGroup(owner, "personal");
      const response = await authorised(request(app).post("/groups"), owner).send({
        ...groupData("personal"), name: "Duplicate personal",
      });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({ code: "CONFLICT", message: "Personal space already exists" });

      const { rows } = await pool.query("SELECT id, name FROM groups WHERE created_by = $1", [owner.id]);
      expect(rows).toEqual([{ id: existing.id, name: existing.name }]);
      // Subsequent requests must still succeed after the failed transaction.
      const shared = await fixtures.createGroup(owner);
      expect(shared.type).toBe("shared");
    });

    test("concurrent Personal requests create one group and return one conflict", async () => {
      const responses = await Promise.all([
        authorised(request(app).post("/groups"), owner).send(groupData("personal")),
        authorised(request(app).post("/groups"), owner).send(groupData("personal")),
      ]);

      expect(responses.map(({ status }) => status).sort()).toEqual([201, 409]);
      expect(responses.find(({ status }) => status === 409).body).toEqual({
        code: "CONFLICT", message: "Personal space already exists",
      });
      const { rows } = await pool.query("SELECT id FROM groups WHERE created_by = $1", [owner.id]);
      expect(rows).toHaveLength(1);
    });

    test("allows different users to each create a Personal group", async () => {
      const otherUser = await fixtures.createUser();
      const first = await fixtures.createGroup(owner, "personal");
      const second = await fixtures.createGroup(otherUser, "personal");

      expect(first.id).not.toBe(second.id);
      expect(second.created_by).toBe(otherUser.id);
    });

    test("allows multiple shared groups alongside one Personal group", async () => {
      await fixtures.createGroup(owner, "personal");
      await fixtures.createGroup(owner);
      await fixtures.createGroup(owner);

      const { rows } = await pool.query("SELECT type FROM groups WHERE created_by = $1", [owner.id]);
      expect(rows.map(({ type }) => type).sort()).toEqual(["personal", "shared", "shared"]);
    });

    test("uses the authenticated owner rather than a supplied created_by", async () => {
      const otherUser = await fixtures.createUser();
      const response = await authorised(request(app).post("/groups"), owner).send({
        ...groupData("personal"), created_by: otherUser.id,
      });

      expect(response.status).toBe(201);
      expect(response.body.created_by).toBe(owner.id);
      expect((await getStoredGroup(response.body.id)).created_by).toBe(owner.id);
    });

    test.each([
      ["missing name", "name", undefined],
      ["empty name", "name", ""],
      ["short name", "name", "A"],
      ["long name", "name", "A".repeat(51)],
      ["missing description", "description", undefined],
      ["empty description", "description", ""],
      ["long description", "description", "A".repeat(501)],
      ["missing type", "type", undefined],
      ["unsupported type", "type", "solo"],
    ])("rejects %s without writing a group", async (_label, field, value) => {
      const response = await authorised(request(app).post("/groups"), owner).send({
        ...groupData(), [field]: value,
      });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        code: "VALIDATION_ERROR",
        errors: expect.arrayContaining([expect.objectContaining({ field })]),
      });
      const { rows } = await pool.query("SELECT id FROM groups WHERE created_by = $1", [owner.id]);
      expect(rows).toEqual([]);
    });
  });

  describe("GET /groups", () => {
    test("returns an empty array when the user has no spaces", async () => {
      const response = await authorised(request(app).get("/groups"), owner);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    test("returns only the owned Personal space and shared memberships", async () => {
      const otherUser = await fixtures.createUser();
      const personal = await fixtures.createGroup(owner, "personal");
      const ownedShared = await fixtures.createGroup(owner);
      const joinedShared = await fixtures.createGroup(otherUser);
      await fixtures.addMember(joinedShared.id, owner);
      await fixtures.createGroup(otherUser, "personal");
      await fixtures.createGroup(otherUser);

      const response = await authorised(request(app).get("/groups"), owner);

      expect(response.status).toBe(200);
      expect(response.body.map(({ id }) => id).sort()).toEqual(
        [personal.id, ownedShared.id, joinedShared.id].sort(),
      );
      expect(response.body).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: personal.id, type: "personal" }),
        expect.objectContaining({ id: joinedShared.id, type: "shared" }),
      ]));
    });

    test("does not discover a shared group solely because the user created it", async () => {
      const shared = await fixtures.createGroup(owner);
      await pool.query("DELETE FROM group_members WHERE group_id = $1 AND user_id = $2", [shared.id, owner.id]);

      const response = await authorised(request(app).get("/groups"), owner);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe("GET /groups/:groupId", () => {
    test.each(["shared", "personal"])("returns a %s group as a direct object", async (type) => {
      const group = await fixtures.createGroup(owner, type);
      const response = await authorised(request(app).get(`/groups/${group.id}`), owner);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: group.id, ...groupData(type), created_by: owner.id, created_at: expect.any(String),
      });
    });
  });

  describe("PATCH /groups/:groupId", () => {
    test.each(["shared", "personal"])("updates and persists %s group details", async (type) => {
      const group = await fixtures.createGroup(owner, type);
      const updates = { name: "Updated group", description: "Updated description" };
      const response = await authorised(request(app).patch(`/groups/${group.id}`), owner).send(updates);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ ...updates, updated_at: expect.any(String) });
      expect(await getStoredGroup(group.id)).toMatchObject({ ...updates, type, created_by: owner.id });
    });

    test.each([
      ["name", { name: "Renamed group" }],
      ["description", { description: "Changed description" }],
    ])("supports updating only %s", async (_field, updates) => {
      const group = await fixtures.createGroup(owner);
      const response = await authorised(request(app).patch(`/groups/${group.id}`), owner).send(updates);

      expect(response.status).toBe(200);
      expect(await getStoredGroup(group.id)).toMatchObject({ ...groupData(), ...updates });
    });

    test.each([
      ["name", ""],
      ["name", "A".repeat(51)],
      ["description", ""],
      ["description", "A".repeat(501)],
    ])("rejects invalid %s without changing the group", async (field, value) => {
      const group = await fixtures.createGroup(owner);
      const response = await authorised(request(app).patch(`/groups/${group.id}`), owner).send({ [field]: value });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        code: "VALIDATION_ERROR",
        errors: expect.arrayContaining([expect.objectContaining({ field })]),
      });
      expect(await getStoredGroup(group.id)).toMatchObject(groupData());
    });

    test.each(["shared", "personal"])("cannot change %s identity through extra body fields", async (type) => {
      const group = await fixtures.createGroup(owner, type);
      const otherUser = await fixtures.createUser();
      const response = await authorised(request(app).patch(`/groups/${group.id}`), owner).send({
        name: "Renamed group",
        type: type === "personal" ? "shared" : "personal",
        created_by: otherUser.id,
      });

      expect(response.status).toBe(200);
      expect(await getStoredGroup(group.id)).toMatchObject({
        name: "Renamed group", type, created_by: owner.id,
      });
    });
  });

  describe("DELETE /groups/:groupId", () => {
    test.each(["shared", "personal"])("deletes a %s group and its memberships and roles", async (type) => {
      const group = await fixtures.createGroup(owner, type);
      const response = await authorised(request(app).delete(`/groups/${group.id}`), owner);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: group.id, name: group.name });
      expect(await getStoredGroup(group.id)).toBeUndefined();
      const members = await pool.query("SELECT * FROM group_members WHERE group_id = $1", [group.id]);
      const roles = await pool.query("SELECT * FROM group_members_roles WHERE group_id = $1", [group.id]);
      expect(members.rows).toEqual([]);
      expect(roles.rows).toEqual([]);
    });

    test("allows a new Personal space after the previous one is deleted", async () => {
      const original = await fixtures.createGroup(owner, "personal");
      const deletion = await authorised(request(app).delete(`/groups/${original.id}`), owner);
      expect(deletion.status).toBe(200);

      const replacement = await fixtures.createGroup(owner, "personal");
      expect(replacement.id).not.toBe(original.id);
    });
  });

  describe("Invalid group IDs", () => {
    test.each(["get", "patch", "delete"])("%s rejects a malformed UUID", async (method) => {
      const response = await authorised(request(app)[method]("/groups/not-a-uuid"), owner)
        .send(method === "patch" ? { name: "Updated name" } : undefined);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        code: "VALIDATION_ERROR",
        errors: expect.arrayContaining([expect.objectContaining({ field: "groupId" })]),
      });
    });

    test.each(["get", "patch", "delete"])("%s returns 404 for a nonexistent group", async (method) => {
      const response = await authorised(request(app)[method](`/groups/${randomUUID()}`), owner)
        .send(method === "patch" ? { name: "Updated name" } : undefined);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ code: "NOT_FOUND", message: "Group not found" });
    });
  });
});
