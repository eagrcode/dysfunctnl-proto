const request = require("supertest");
const app = require("../../src/app");
const dotenv = require("dotenv");
const { logger } = require("../../src/lib/logger");

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
    throw new Error(
      `Failed to register: ${response.body.message || response.body.error || "Unknown error"}`,
    );
  }

  logger.info("REGISTER MEMBER:", {
    success: response.body.success,
    user: {
      id: response.body.data.id,
      email: response.body.data.email,
      first_name: response.body.data.first_name,
      last_name: response.body.data.last_name,
    },
  });

  const { id: userId, email } = response.body.data;

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
      throw new Error(
        `Failed to login: ${response.body.message || response.body.error || "Unknown error"}`,
      );
    }

    logger.info("LOGIN:", {
      success: response.body.success,
      user: {
        id: response.body.user.id,
        email: response.body.user.email,
        first_name: response.body.user.first_name,
        last_name: response.body.user.last_name,
      },
      accessToken: response.body.user.accessToken ? true : false,
      refreshToken: response.body.user.refreshToken ? true : false,
    });

    const { user } = response.body;

    return {
      user,
      accessToken: user.accessToken,
      refreshToken: user.refreshToken,
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
        `Failed to create group: ${response.body.message || response.body.error || "Unknown error"}`,
      );
    }

    logger.info("CREATE GROUP:", {
      success: response.body.success,
      group: response.body.data,
    });
    const groupId = response.body.data;

    return groupId;
  } catch (error) {
    throw new Error(error);
  }
};

// ADD MEMBER
const addMember = async (groupId, memberId, adminAccessToken) => {
  try {
    const response = await request(app)
      .post(`/groups/${groupId}/members`)
      .send({ userIdToAdd: memberId })
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${adminAccessToken}`);

    logger.info("ADD MEMBER:", {
      success: response.body.success,
      member: response.body.data,
    });

    if (response.status !== 201) {
      throw new Error(
        `Failed to add member to group: ${response.body.message || response.body.error || "Unknown error"}`,
      );
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
      throw new Error(
        `Failed to create text channel: ${response.body.message || response.body.error || "Unknown error"}`,
      );
    }

    logger.info("CREATE TEXT CHANNEL:", {
      success: response.body.success,
      channel: response.body.data,
    });

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
      throw new Error(
        `Failed to create album: ${response.body.message || response.body.error || "Unknown error"}`,
      );
    }

    logger.info("CREATE ALBUM:", {
      success: response.body.success,
      album: response.body.data,
    });

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
      .attach("image", "tests/fixtures/images/test-image.png");

    if (response.status !== 201) {
      throw new Error(
        `Failed to upload image: ${response.body.message || response.body.error || "Unknown error"}`,
      );
    }

    logger.info("UPLOAD IMAGE:", {
      success: response.body.success,
      image: response.body.data,
    });

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
