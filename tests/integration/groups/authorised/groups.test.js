const request = require("supertest");
const app = require("../../../../app");

const TEST_EMAIL = "test@login.com";
const TEST_PASSWORD = "loginpassword";

describe("Groups API Integration Tests", () => {
  let accessToken;
  let createdBy;
  let groupId;
  let userIdToAdd;

  const data = {
    name: "Test New Group",
    description: "New description",
  };

  const updatedData = {
    name: "Updated Group Name",
    description: "Updated group description",
  };

  // LOGIN BEFORE TESTS
  beforeAll(async () => {
    const loginCredentials = {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    };

    const loginResponse = await request(app)
      .post("/auth/login")
      .send(loginCredentials)
      .set("Content-Type", "application/json");

    console.log("LOGIN RESPONSE:", JSON.stringify(loginResponse.body, null, 2));

    createdBy = loginResponse.body.user.id;
    accessToken = loginResponse.body.accessToken;

    expect(loginResponse.status).toBe(200);
    expect(accessToken).toBeDefined();
  });

  // CREATE GROUP
  describe("POST: Test /groups", () => {
    test("It should create a new group", async () => {
      const response = await request(app)
        .post("/groups")
        .send(data)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${accessToken}`);

      console.log(
        "CREATE GROUP RESPONSE:",
        JSON.stringify(response.body, null, 2)
      );

      groupId = response.body.data.group.id;

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.group).toHaveProperty("id");
      expect(response.body.data.group).toHaveProperty("created_at");
      expect(response.body.data.group.created_by).toBe(createdBy);
      expect(response.body.data.group.name).toBe(data.name);
      expect(response.body.data.group.description).toBe(data.description);
      expect(response.body.data.group.updated_at).toBe(null);
    });
  });

  // GET GROUP BY ID
  describe("GET: Test /groups/:groupId get by ID", () => {
    test("It should return the newly created group", async () => {
      expect(groupId).toBeDefined();

      const response = await request(app)
        .get(`/groups/${groupId}`)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${accessToken}`);

      console.log(
        "GET GROUP BY ID RESPONSE:",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("id");
      expect(response.body.data).toHaveProperty("created_at");
      expect(response.body.data.created_by).toBe(createdBy);
      expect(response.body.data.name).toBe(data.name);
      expect(response.body.data.description).toBe(data.description);
      expect(response.body.data.updated_at).toBe(null);
    });
  });

  // UPDATE GROUP
  describe("PATCH: Test /groups/:groupId update group", () => {
    test("It should return the previously created group with updated details", async () => {
      const response = await request(app)
        .patch(`/groups/${groupId}`)
        .send(updatedData)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${accessToken}`);

      console.log(
        "UPDATE GROUP RESPONSE:",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("updated_at");
      expect(response.body.data.name).toBe(updatedData.name);
      expect(response.body.data.description).toBe(updatedData.description);
    });
  });

  // REGISTER NEW USER BEFORE ADDING TO GROUP
  describe("POST: Test /auth/register", () => {
    test("It should return a newly registered user", async () => {
      const data = {
        email: `test${Date.now()}@register.com`,
        password: "securetestpassword",
        first_name: "Test",
        last_name: "User",
      };

      const response = await request(app)
        .post("/auth/register")
        .send(data)
        .set("Content-Type", "application/json");

      userIdToAdd = response.body.id;

      console.log(
        "REGISTER USER RESPONSE:",
        JSON.stringify(response.body, null, 2)
      );
    });
  });

  // ADD USER TO GROUP
  describe("POST: Test /groups/:groupId/add-member", () => {
    test("It should add the newly registered user to the previously created group", async () => {
      const response = await request(app)
        .post(`/groups/${groupId}/add-member`)
        .send({ userIdToAdd })
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${accessToken}`);

      console.log(
        "ADD USER TO GROUP RESPONSE:",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.member.user_id).toBe(userIdToAdd);
      expect(response.body.data.member.group_id).toBe(groupId);
      expect(response.body.data.role.is_admin).toBe(false);
      expect(response.body.data.member.joined_at).toBeDefined();
      expect(new Date(response.body.data.joined_at)).toBeInstanceOf(Date);
    });
  });

  // DELETE GROUP
  describe("DELETE: Test /groups delete group", () => {
    test("It should delete the previously created group", async () => {
      const response = await request(app)
        .delete(`/groups/${groupId}`)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${accessToken}`);

      console.log(
        "DELETE GROUP RESPONSE:",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(groupId);
      expect(response.body.data.name).toBe(updatedData.name);
    });
  });
});
