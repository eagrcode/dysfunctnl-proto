const request = require("supertest");
const app = require("../../../../app");

const TEST_EMAIL = "testrlsfail@fail.com";
const TEST_PASSWORD = "securetestpassword";
const TEST_GROUP_ID = "36310a6a-1145-497e-8ac0-f27b410effa7";

describe("Groups API Integration Tests", () => {
  let accessToken;
  let userIdToAdd;

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

    accessToken = loginResponse.body.accessToken;

    expect(loginResponse.status).toBe(200);
    expect(accessToken).toBeDefined();
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

  // ADD USER TO GROUP WHERE USER ROLE = MEMBER (ONLY ADMINS CAN ADD NEW MEMBERS)
  describe("POST: Test /groups/:groupId/add-member", () => {
    test("It should add the newly registered user to the previously created group", async () => {
      const response = await request(app)
        .post(`/groups/${TEST_GROUP_ID}/add-member`)
        .send({ userIdToAdd })
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${accessToken}`);

      console.log(
        "ADD USER TO GROUP RESPONSE:",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(403);
      expect(response.body.error).toBeDefined();
    });
  });
});
