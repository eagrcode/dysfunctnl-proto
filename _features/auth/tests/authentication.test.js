const request = require("supertest");
const app = require("../../../app");
const dotenv = require("dotenv");

dotenv.config();

const TEST_PASSWORD = process.env.TEST_USER_PASSWORD;

describe("Auth API Tests - Registration & Login", () => {
  let email;

  // REGISTER
  describe("Register", () => {
    test("should register a new user", async () => {
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

      console.log("REGISTER RESPONSE:", JSON.stringify(response.body, null, 2));

      email = response.body.email;

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.email).toBe(data.email);
      expect(response.body.first_name).toBe(data.first_name);
      expect(response.body.last_name).toBe(data.last_name);
      expect(response.body.password_hash).toBeUndefined();
    });

    test("should reject registration with missing fields", async () => {
      const response = await request(app)
        .post("/auth/register")
        .send({ email: "incomplete@test.com" })
        .set("Content-Type", "application/json");

      console.log("REGISTER MISSING FIELDS RESPONSE:", JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("VALIDATION_ERROR");
      expect(response.body.errors).toBeDefined();
    });
  });

  // LOGIN
  describe("Login", () => {
    test("should log in with valid credentials", async () => {
      const response = await request(app)
        .post("/auth/login")
        .send({ email, password: TEST_PASSWORD })
        .set("Content-Type", "application/json");

      console.log("LOGIN RESPONSE:", JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBeDefined();
      expect(response.body.user.email).toBe(email);
      expect(response.body.user.accessToken).toBeDefined();
      expect(response.body.user.refreshToken).toBeDefined();
      expect(response.body.user.password_hash).toBeUndefined();
    });

    test("should reject invalid password", async () => {
      const response = await request(app)
        .post("/auth/login")
        .send({ email, password: "wrongpassword" })
        .set("Content-Type", "application/json");

      console.log("INVALID PASSWORD RESPONSE:", JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Invalid credentials");
      expect(response.body.code).toBe("UNAUTHORISED");
    });

    test("should reject non-existent email", async () => {
      const response = await request(app)
        .post("/auth/login")
        .send({ email: "nonexistent@test.com", password: TEST_PASSWORD })
        .set("Content-Type", "application/json");

      console.log("NON-EXISTENT EMAIL RESPONSE:", JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Invalid credentials");
      expect(response.body.code).toBe("UNAUTHORISED");
    });
  });
});
