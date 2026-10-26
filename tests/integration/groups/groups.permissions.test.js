const { randomUUID } = require("node:crypto");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const {
  app, pool, groupData, authorised, verifyGroupDatabase, createGroupsFixtures,
} = require("../../helpers/groups-fixtures");

jest.setTimeout(15000);

describe("Groups access and permission integration", () => {
  let fixtures;
  let users;
  let shared;
  let personal;

  beforeAll(verifyGroupDatabase);

  beforeEach(async () => {
    fixtures = createGroupsFixtures();
    users = {};
    for (const role of ["creator", "admin", "member", "outsider"]) {
      users[role] = await fixtures.createUser();
    }
    shared = await fixtures.createGroup(users.creator);
    personal = await fixtures.createGroup(users.creator, "personal");
    await fixtures.addMember(shared.id, users.admin, true);
    await fixtures.addMember(shared.id, users.member);
  });

  afterEach(async () => {
    await fixtures?.cleanup();
  });

  afterAll(async () => {
    await pool.end();
  });

  const accessGroup = (method, group, user) =>
    authorised(request(app)[method](`/groups/${group.id}`), user)
      .send(method === "patch" ? { name: "Updated name" } : undefined);

  test.each(["creator", "admin", "member"])("shared %s can read the group", async (role) => {
    const response = await accessGroup("get", shared, users[role]);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: shared.id, type: "shared" });
  });

  test.each([
    ["creator", "patch", 200],
    ["creator", "delete", 200],
    ["admin", "patch", 200],
    ["admin", "delete", 403],
    ["member", "patch", 403],
    ["member", "delete", 403],
  ])("shared %s receives %s status %i", async (role, method, status) => {
    const response = await accessGroup(method, shared, users[role]);

    expect(response.status).toBe(status);
    if (status === 403) {
      expect(response.body).toEqual({
        code: "PERMISSION_DENIED",
        message: `Requires ${method === "delete" ? "creator" : "admin"} permission`,
      });
      const { rows } = await pool.query("SELECT name FROM groups WHERE id = $1", [shared.id]);
      expect(rows).toEqual([{ name: shared.name }]);
    } else if (method === "patch") {
      const { rows } = await pool.query("SELECT name FROM groups WHERE id = $1", [shared.id]);
      expect(rows).toEqual([{ name: "Updated name" }]);
    } else {
      const { rows } = await pool.query("SELECT id FROM groups WHERE id = $1", [shared.id]);
      expect(rows).toEqual([]);
    }
  });

  test.each([
    ["shared", "get"], ["shared", "patch"], ["shared", "delete"],
    ["personal", "get"], ["personal", "patch"], ["personal", "delete"],
  ])("hides %s groups from outsiders on %s", async (type, method) => {
    const group = type === "personal" ? personal : shared;
    const response = await accessGroup(method, group, users.outsider);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ code: "NOT_FOUND", message: "Group not found" });
    const { rows } = await pool.query("SELECT name FROM groups WHERE id = $1", [group.id]);
    expect(rows).toEqual([{ name: group.name }]);
  });

  test.each(["get", "patch", "delete"])("Personal owner can %s without a membership or role", async (method) => {
    const members = await pool.query("SELECT * FROM group_members WHERE group_id = $1", [personal.id]);
    const roles = await pool.query("SELECT * FROM group_members_roles WHERE group_id = $1", [personal.id]);
    expect(members.rows).toEqual([]);
    expect(roles.rows).toEqual([]);

    const response = await accessGroup(method, personal, users.creator);

    expect(response.status).toBe(200);
    if (method === "get") expect(response.body.id).toBe(personal.id);
    if (method === "patch") expect(response.body.name).toBe("Updated name");
    if (method === "delete") expect(response.body).toEqual({ id: personal.id, name: personal.name });
  });

  test.each(["get", "patch", "delete"])("a shared creator without membership cannot %s", async (method) => {
    await pool.query("DELETE FROM group_members WHERE group_id = $1 AND user_id = $2", [shared.id, users.creator.id]);

    const response = await accessGroup(method, shared, users.creator);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ code: "NOT_FOUND", message: "Group not found" });
  });

  test.each([
    ["get", "/groups"],
    ["post", "/groups"],
    ["get", "/groups/group-id"],
    ["patch", "/groups/group-id"],
    ["delete", "/groups/group-id"],
  ])("%s %s requires authentication before group access", async (method, path) => {
    const response = await request(app)[method](path.replace("group-id", shared.id)).send(groupData());

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ code: "ACCESS_TOKEN_MISSING", message: "Access token required" });
  });

  test("rejects an invalid token", async () => {
    const response = await request(app).get("/groups").set("Authorization", "Bearer invalid-token");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ code: "ACCESS_TOKEN_INVALID", message: "Invalid token" });
  });

  test("rejects an expired token", async () => {
    const accessToken = jwt.sign({ id: users.creator.id }, process.env.JWT_SECRET, { expiresIn: -1 });
    const response = await authorised(request(app).get("/groups"), { accessToken });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ code: "ACCESS_TOKEN_EXPIRED", message: "Invalid token" });
  });

  test("rejects a token signed with a different secret", async () => {
    const accessToken = jwt.sign({ id: users.creator.id }, randomUUID(), { expiresIn: "5m" });
    const response = await authorised(request(app).get("/groups"), { accessToken });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("ACCESS_TOKEN_INVALID");
  });
});
