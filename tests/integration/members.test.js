const request = require("supertest");
const app = require("../../app");
const dotenv = require("dotenv");

dotenv.config();

const TEST_EMAIL = process.env.TEST_USER_1;
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD;

describe("Groups API Integration Tests", () => {
  // Test data and tokens
  let adminAccessToken;
  let adminUserId;
  let groupId;
  let memberId;
  let memberEmail;
  let memberAccessToken;

  // Helper function for user registration
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

    return {
      userId: response.body.id,
      email: response.body.email,
      response,
    };
  };

  // Helper function for user login
  const loginUser = async (email) => {
    const loginCredentials = {
      email,
      password: TEST_PASSWORD,
    };

    const response = await request(app)
      .post("/auth/login")
      .send(loginCredentials)
      .set("Content-Type", "application/json");

    return {
      accessToken: response.body.accessToken,
      userId: response.body.user.id,
      response,
    };
  };

  // Initial setup - login admin user
  beforeAll(async () => {
    const adminLogin = await loginUser(TEST_EMAIL);
    adminAccessToken = adminLogin.accessToken;
    adminUserId = adminLogin.userId;

    console.log(
      "ADMIN LOGIN:",
      JSON.stringify(adminLogin.response.body, null, 2)
    );

    expect(adminLogin.response.status).toBe(200);
    expect(adminAccessToken).toBeDefined();
  });

  // CREATE TEST GROUP
  describe("Create Group", () => {
    test("should create a new group successfully", async () => {
      const response = await request(app)
        .post("/groups")
        .send(groupData)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${adminAccessToken}`);

      console.log("CREATE GROUP:", JSON.stringify(response.body, null, 2));

      groupId = response.body.data.group.id;

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.group).toMatchObject({
        id: expect.any(String),
        created_by: adminUserId,
        name: groupData.name,
        description: groupData.description,
        created_at: expect.any(String),
        updated_at: null,
      });
    });
  });

  // MEMBER MANAGEMENT
  describe("Member Management", () => {
    describe("Setup - Register and Add Member", () => {
      // REGISTER NEW USER
      test("should register a new user for testing", async () => {
        const { userId, email, response } = await registerUser();

        memberId = userId;
        memberEmail = email;

        console.log("REGISTER MEMBER:", JSON.stringify(response.body, null, 2));

        expect(response.status).toBe(201);
        expect(memberId).toBeDefined();
        expect(memberEmail).toBeDefined();
      });

      // ADD NEW USER AS MEMBER
      test("should add new user to the group", async () => {
        const response = await request(app)
          .post(`/groups/${groupId}/members/add-member`)
          .send({ userIdToAdd: memberId })
          .set("Content-Type", "application/json")
          .set("Authorization", `Bearer ${adminAccessToken}`);

        console.log("ADD MEMBER:", JSON.stringify(response.body, null, 2));

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.member).toMatchObject({
          user_id: memberId,
          group_id: groupId,
          joined_at: expect.any(String),
        });
        expect(response.body.data.role.is_admin).toBe(false);
      });
    });

    describe("Member CRUD Operations", () => {
      test("should get all group members", async () => {
        const response = await request(app)
          .get(`/groups/${groupId}/members`)
          .set("Content-Type", "application/json")
          .set("Authorization", `Bearer ${adminAccessToken}`);

        console.log("GET ALL MEMBERS:", JSON.stringify(response.body, null, 2));
      });
    });

    // AUTHORISED ACTIONS
    describe("Role Management - Authorised Actions", () => {
      // UPDATE MEMBER TO ADMIN
      test("should promote member to admin", async () => {
        const response = await request(app)
          .patch(`/groups/${groupId}/members/${memberId}/role`)
          .send({ userId: memberId, isAdmin: true })
          .set("Content-Type", "application/json")
          .set("Authorization", `Bearer ${adminAccessToken}`);

        console.log(
          "PROMOTE TO ADMIN:",
          JSON.stringify(response.body, null, 2)
        );

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          user_id: memberId,
          group_id: groupId,
          is_admin: true,
        });
      });

      // REVOKE MEMBER ADMIN PRIVILEGES
      test("should demote admin back to regular member", async () => {
        const response = await request(app)
          .patch(`/groups/${groupId}/members/${memberId}/role`)
          .send({ userId: memberId, isAdmin: false })
          .set("Content-Type", "application/json")
          .set("Authorization", `Bearer ${adminAccessToken}`);

        console.log(
          "DEMOTE FROM ADMIN:",
          JSON.stringify(response.body, null, 2)
        );

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          user_id: memberId,
          group_id: groupId,
          is_admin: false,
        });
      });
    });
  });

  // UNAUTHORISED ACTIONS
  describe("Permission Testing - Unauthorised Actions", () => {
    describe("Setup - Login as Regular Member", () => {
      // LOGIN NON ADMIN MEMBER
      test("should login as regular member", async () => {
        const { accessToken, userId, response } = await loginUser(memberEmail);

        memberAccessToken = accessToken;

        console.log("MEMBER LOGIN:", JSON.stringify(response.body, null, 2));

        expect(response.status).toBe(200);
        expect(userId).toBe(memberId);
        expect(memberAccessToken).toBeDefined();
      });
    });

    describe("Member Attempting Admin Actions", () => {
      // SELF PROMOTE TO ADMIN
      test("should deny member self-promotion to admin", async () => {
        const response = await request(app)
          .patch(`/groups/${groupId}/members/${memberId}/role`)
          .send({ userId: memberId, isAdmin: true })
          .set("Content-Type", "application/json")
          .set("Authorization", `Bearer ${memberAccessToken}`);

        console.log(
          "UNAUTHORISED SELF-PROMOTION:",
          JSON.stringify(response.body, null, 2)
        );

        expect(response.status).toBe(403);
        expect(response.body.error).toBeDefined();
        expect(response.body.code).toBe("PERMISSION_DENIED");
      });
    });
  });
});
