const request = require("supertest");
const app = require("../../../app");
const dotenv = require("dotenv");

dotenv.config();

const TEST_PASSWORD = process.env.TEST_USER_PASSWORD;

describe("Auth API tests", () => {
  let email;

  // REGISTER NEW USER
  describe("POST: Test /auth/register", () => {
    test("It should return a newly registered user", async () => {
      const data = {
        email: `test${Date.now()}@register.com`,
        password: TEST_PASSWORD,
        first_name: "Test",
        last_name: "User",
      };

      const response = await request(app)
        .post("/auth/register")
        .send(data)
        .set("Content-Type", "application/json");

      email = response.body.email;

      console.log(
        "REGISTER USER RESPONSE:",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(new Date(response.body.created_at)).toBeInstanceOf(Date);
      expect(response.body.updated_at).toBe(null);
      expect(response.body.password_hash).toBeDefined();
    });
  });

  // LOGIN USER
  describe("POST: Test /auth/login", () => {
    test("It should log in the newly created user", async () => {
      const loginCredentials = {
        email: email,
        password: TEST_PASSWORD,
      };

      const loginResponse = await request(app)
        .post("/auth/login")
        .send(loginCredentials)
        .set("Content-Type", "application/json");

      console.log(
        "LOGIN RESPONSE:",
        JSON.stringify(loginResponse.body, null, 2)
      );

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.user).toBeDefined();
      expect(loginResponse.body.user.id).toBeDefined();
      expect(loginResponse.body.user.email).toBe(email);
      expect(loginResponse.body.accessToken).toBeDefined();
      expect(loginResponse.body.refreshToken).toBeDefined();
    });
  });
});
