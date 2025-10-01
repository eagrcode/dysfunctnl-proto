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
      `Failed to register: ${response.body.error || "Unknown error"}`
    );
  }

  console.log("REGISTER MEMBER:", JSON.stringify(response.body, null, 2));
  const { id: userId, email } = response.body;

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

    if (response.status !== 200) {
      throw new Error(
        `Failed to login: ${response.body.error || "Unknown error"}`
      );
    }

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

// CREATE GROUP
const createGroup = async (data, accessToken) => {
  try {
    const response = await request(app)
      .post("/groups")
      .send(data)
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${accessToken}`);

    if (response.status !== 201) {
      throw new Error(
        `Failed to create group: ${response.body.error || "Unknown error"}`
      );
    }

    console.log("CREATE GROUP:", JSON.stringify(response.body, null, 2));
    groupId = response.body.data.group.id;

    return groupId;
  } catch (error) {
    throw new Error(error);
  }
};

// ADD MEMBER
const addMember = async (groupId, memberId, adminAccessToken) => {
  try {
    const response = await request(app)
      .post(`/groups/${groupId}/members/add-member`)
      .send({ userIdToAdd: memberId })
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${adminAccessToken}`);

    console.log("ADD MEMBER:", JSON.stringify(response.body, null, 2));

    if (response.status !== 201) {
      throw new Error(
        `Failed to add member to group: ${
          response.body.error || "Unknown error"
        }`
      );
    }

    const { success } = response.body;
    const { role } = response.body.data;

    return { success, role };
  } catch (error) {
    throw new Error(error);
  }
};

module.exports = { registerUser, loginUser, createGroup, addMember };
