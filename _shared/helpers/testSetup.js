const request = require("supertest");
const app = require("../../app"); // Adjust path as needed
const dotenv = require("dotenv");

dotenv.config();

// REGISTER
const registerUser = async () => {
  const userData = {
    email: `test${Date.now()}@register.com`,
    password: process.env.TEST_USER_PASSWORD,
    first_name: "Test",
    last_name: "User",
  };

  const response = await request(app)
    .post("/auth/register")
    .send(userData)
    .set("Content-Type", "application/json");

  if (response.status !== 201) {
    throw new Error(`Failed to register: ${response.body.error || "Unknown error"}`);
  }

  console.log("REGISTER MEMBER:", JSON.stringify(response.body, null, 2));
  const { id: userId, email } = response.body;

  return {
    userId,
    email,
  };
};

// LOGIN
const loginUser = async (email) => {
  const data = {
    email: email,
    password: process.env.TEST_USER_PASSWORD,
  };

  try {
    const response = await request(app)
      .post("/auth/login")
      .send(data)
      .set("Content-Type", "application/json");

    if (response.status !== 200) {
      throw new Error(`Failed to login: ${response.body.error || "Unknown error"}`);
    }

    console.log("LOGIN:", JSON.stringify(response.body, null, 2));
    const { user, accessToken, refreshToken } = response.body;

    return {
      user,
      accessToken,
      refreshToken,
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
      throw new Error(`Failed to create group: ${response.body.error || "Unknown error"}`);
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
      throw new Error(`Failed to add member to group: ${response.body.error || "Unknown error"}`);
    }

    const { success } = response.body;
    const { role } = response.body.data;

    return { success, role };
  } catch (error) {
    throw new Error(error);
  }
};

// CREATE TEXT CHANNEL
const createTextChannel = async (groupId, channelData, accessToken) => {
  try {
    const response = await request(app)
      .post(`/groups/${groupId}/text-channels`)
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        channelName: channelData,
      });

    if (response.status !== 201) {
      throw new Error(`Failed to create text channel: ${response.body.error || "Unknown error"}`);
    }

    console.log("CREATE TEXT CHANNEL:", JSON.stringify(response.body, null, 2));

    const channelId = response.body.data.id;

    return channelId;
  } catch (error) {
    throw new Error(error);
  }
};

// CREATE ALBUM
const createAlbum = async (groupId, albumData, accessToken) => {
  try {
    const response = await request(app)
      .post(`/groups/${groupId}/albums`)
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(albumData);

    if (response.status !== 201) {
      throw new Error(`Failed to create album: ${response.body.error || "Unknown error"}`);
    }

    console.log("CREATE ALBUM:", JSON.stringify(response.body, null, 2));

    const albumId = response.body.data.id;

    return albumId;
  } catch (error) {
    throw new Error(error);
  }
};

const uploadImageToAlbum = async (groupId, albumId, accessToken) => {
  try {
    const response = await request(app)
      .post(`/groups/${groupId}/albums/${albumId}/media/upload`)
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${accessToken}`)
      .attach("image", "_test-images/test-image.png");

    if (response.status !== 201) {
      throw new Error(`Failed to upload image: ${response.body.error || "Unknown error"}`);
    }

    console.log("UPLOAD IMAGE:", JSON.stringify(response.body, null, 2));

    const imageId = response.body.data.id;

    return imageId;
  } catch (error) {
    throw new Error(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  createGroup,
  addMember,
  createTextChannel,
  createAlbum,
  uploadImageToAlbum,
};
