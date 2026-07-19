const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../../../app");
const { loginUser, createGroup, registerUser } = require("../../../_shared/helpers/testSetup");

jest.setTimeout(20000);

describe("Auth API Tests - Token Refresh Flow", () => {
  let email;
  let userId;
  let groupId;

  const groupData = {
    name: "Test Group",
    description: "Test description",
  };

  const postRefresh = (body) => request(app).post("/auth/refresh").send(body);

  const getGroup = (accessToken) => {
    const testRequest = request(app).get(`/groups/${groupId}`);

    return accessToken
      ? testRequest.set("Authorization", `Bearer ${accessToken}`)
      : testRequest;
  };

  const createExpiredAccessToken = () =>
    jwt.sign(
      {
        id: userId,
        exp: Math.floor(Date.now() / 1000) - 60,
      },
      process.env.JWT_SECRET,
    );

  beforeAll(async () => {
    const registeredUser = await registerUser();
    email = registeredUser.email;
    userId = registeredUser.userId;

    const { accessToken } = await loginUser(email);
    groupId = await createGroup(groupData, accessToken);
  });

  test("returns stable codes for missing and invalid access tokens", async () => {
    const missingTokenResponse = await getGroup();

    expect(missingTokenResponse.status).toBe(401);
    expect(missingTokenResponse.body).toMatchObject({
      success: false,
      code: "ACCESS_TOKEN_MISSING",
    });

    const invalidTokenResponse = await getGroup("not-a-valid-jwt");

    expect(invalidTokenResponse.status).toBe(401);
    expect(invalidTokenResponse.body).toMatchObject({
      success: false,
      code: "ACCESS_TOKEN_INVALID",
    });
  });

  test("refreshes an expired access token, rotates the refresh token, and retries", async () => {
    const { refreshToken } = await loginUser(email);
    const expiredAccessToken = createExpiredAccessToken();

    const expiredTokenResponse = await getGroup(expiredAccessToken);

    expect(expiredTokenResponse.status).toBe(401);
    expect(expiredTokenResponse.body).toMatchObject({
      success: false,
      code: "ACCESS_TOKEN_EXPIRED",
    });

    const refreshResponse = await postRefresh({ refreshToken });

    expect(refreshResponse.status).toBe(200);
    expect(typeof refreshResponse.body.accessToken).toBe("string");
    expect(typeof refreshResponse.body.refreshToken).toBe("string");
    expect(refreshResponse.body.refreshToken).not.toBe(refreshToken);

    const retriedResponse = await getGroup(refreshResponse.body.accessToken);

    expect(retriedResponse.status).toBe(200);
    expect(retriedResponse.body.success).toBe(true);

    const reusedTokenResponse = await postRefresh({ refreshToken });

    expect(reusedTokenResponse.status).toBe(401);
    expect(reusedTokenResponse.body).toMatchObject({
      success: false,
      code: "REFRESH_TOKEN_INVALID",
    });

    const nextRotationResponse = await postRefresh({
      refreshToken: refreshResponse.body.refreshToken,
    });

    expect(nextRotationResponse.status).toBe(200);
    expect(typeof nextRotationResponse.body.accessToken).toBe("string");
    expect(typeof nextRotationResponse.body.refreshToken).toBe("string");
  });

  test("allows exactly one concurrent refresh with the same token", async () => {
    const { refreshToken } = await loginUser(email);

    const responses = await Promise.all([
      postRefresh({ refreshToken }),
      postRefresh({ refreshToken }),
    ]);

    expect(responses.map(({ status }) => status).sort()).toEqual([200, 401]);

    const successfulResponse = responses.find(({ status }) => status === 200);
    const rejectedResponse = responses.find(({ status }) => status === 401);

    expect(successfulResponse).toBeDefined();
    expect(rejectedResponse).toBeDefined();
    expect(rejectedResponse.body).toMatchObject({
      success: false,
      code: "REFRESH_TOKEN_INVALID",
    });

    const followUpResponse = await postRefresh({
      refreshToken: successfulResponse.body.refreshToken,
    });

    expect(followUpResponse.status).toBe(200);
  });

  test.each([
    ["missing", {}, "REFRESH_TOKEN_REQUIRED"],
    ["empty", { refreshToken: "" }, "REFRESH_TOKEN_REQUIRED"],
    ["malformed", { refreshToken: "not-a-refresh-token" }, "REFRESH_TOKEN_INVALID"],
    ["non-string", { refreshToken: 42 }, "REFRESH_TOKEN_INVALID"],
  ])("rejects a %s refresh token", async (_caseName, body, expectedCode) => {
    const response = await postRefresh(body);

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      success: false,
      code: expectedCode,
    });
  });
});
