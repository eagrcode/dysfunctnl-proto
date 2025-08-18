const request = require("supertest");
const app = require("../../../../app");

const TEST_EMAIL = "testrlsfail@fail.com";
const TEST_PASSWORD = "securetestpassword";
const TEST_GROUP_ID = "36310a6a-1145-497e-8ac0-f27b410effa7";

describe("Groups API Integration Tests", () => {
  let accessToken;

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

  // GET GROUP BY ID WHERE MEMBER SHOULD NOT HAVE ACCESS
  describe("GET: Test /groups get by ID", () => {
    test("It should fail to return the group", async () => {
      const response = await request(app)
        .get(`/groups/${TEST_GROUP_ID}`)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${accessToken}`);

      console.log(
        "GET GROUP BY ID RESPONSE:",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(403);
      expect(response.body.error).toBeDefined();
    });
  });
});
