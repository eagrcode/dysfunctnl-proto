const request = require("supertest");
const app = require("../../../app");
const { loginUser, createGroup, registerUser } = require("../../../_shared/helpers/testSetup");

describe("Token Refresh Flow", () => {
  let accessToken;
  let refreshToken;
  let groupId;

  const groupData = {
    name: "Test Group",
    description: "Test description",
  };

  // Setup: Login to get initial tokens, create group to fetch later
  beforeAll(async () => {
    const { email } = await registerUser();

    const { accessToken: initialAccessToken, refreshToken: initialRefreshToken } = await loginUser(
      email
    );
    accessToken = initialAccessToken;
    refreshToken = initialRefreshToken;

    groupId = await createGroup(groupData, accessToken);
  });

  test("should attempt access, refresh if invalid, and retry", async () => {
    await new Promise((resolve) => setTimeout(resolve, 5000));

    console.log(
      "Attempting to access protected resource with expired access token:",
      accessToken.slice(0, 7) + "***"
    );

    let response = await request(app)
      .get(`/groups/${groupId}`)
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${accessToken}`);

    console.log("Initial Response:", JSON.stringify(response.body, null, 2));

    if (response.status === 401 && response.body.error === "Invalid token") {
      console.log("Access token expired, attempting to refresh...");

      const refreshResponse = await request(app)
        .post("/auth/refresh")
        .send({ refreshToken })
        .set("Content-Type", "application/json");

      console.log(
        "Refresh Response:",
        JSON.stringify(refreshResponse.body, null, 2).slice(0, 7) + "***"
      );

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.accessToken).toBeDefined();
      accessToken = refreshResponse.body.accessToken;

      console.log("Retrying access with new access token:", accessToken.slice(0, 7) + "***");

      response = await request(app)
        .get(`/groups/${groupId}`)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${accessToken}`);

      console.log("Refreshed Response:", JSON.stringify(response.body, null, 2));
    }

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  }, 20000);
});
