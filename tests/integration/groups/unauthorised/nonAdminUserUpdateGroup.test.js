const request = require("supertest");
const app = require("../../../../app");

const TEST_EMAIL = "testrlsfail@fail.com";
const TEST_PASSWORD = "securetestpassword";
const TEST_GROUP_ID = "36310a6a-1145-497e-8ac0-f27b410effa7";

describe("Groups API Integration Tests", () => {
  let accessToken;

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

    accessToken = loginResponse.body.accessToken;

    expect(loginResponse.status).toBe(200);
    expect(accessToken).toBeDefined();
  });

  // UPDATE GROUP WHERE USER ROLE = MEMBER (ONLY ADMINS CAN UPDATE)
  describe("PATCH: Test /groups update group", () => {
    test("It should fail to update the group details", async () => {
      const response = await request(app)
        .patch(`/groups/${TEST_GROUP_ID}`)
        .send(updatedData)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${accessToken}`);

      console.log(
        "UPDATE GROUP RESPONSE:",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(403);
      expect(response.body.error).toBeDefined();
    });
  });
});
