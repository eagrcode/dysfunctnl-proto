const request = require("supertest");
const app = require("../../app"); // Adjust path as needed
const dotenv = require("dotenv");

dotenv.config();

const TEST_PASSWORD = process.env.TEST_USER_PASSWORD;

// REGISTER
const registerUser = async () => {
  const userData = {
    email: `test${Date.now()}@register.com`,
    password: TEST_PASSWORD,
    first_name: "Test",
    last_name: "User",
  };

  const response = await request(app)
    .post("/auth/register")
    .send(userData)
    .set("Content-Type", "application/json");

  if (response.status !== 201) {
    throw new Error(
      `Failed to register: ${response.body.error} || Unknown error`
    );
  }

  console.log("REGISTER MEMBER:", JSON.stringify(response.body, null, 2));

  const { id: userId, email } = response.body;

  // expect(response.status).toBe(201);
  // expect(response.body).toMatchObject({
  //   id: expect.any(String),
  //   email: expect.any(String),
  //   password_hash: expect.any(String),
  //   first_name: expect.any(String),
  //   last_name: expect.any(String),
  //   created_at: expect.any(String),
  //   updated_at: null,
  // });

  return {
    userId,
    email,
  };
};

// LOGIN
const loginUser = async (email, password = TEST_PASSWORD) => {
  const data = {
    email: email,
    password: password,
  };

  try {
    const response = await request(app)
      .post("/auth/login")
      .send(data)
      .set("Content-Type", "application/json");

    console.log("LOGIN:", JSON.stringify(response.body, null, 2));

    const { user, accessToken, refreshToken } = response.body;

    return {
      user,
      accessToken,
    };
  } catch (error) {
    throw new Error(error);
  }
};

module.exports = { registerUser, loginUser };
