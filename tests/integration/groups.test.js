const request = require("supertest");
const app = require("../../app");
const dotenv = require("dotenv");
const { registerUser, loginUser } = require("../helpers/setup");

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
  let nonMemberId;
  let nonMemberEmail;
  let nonMemberAccessToken;

  const groupData = {
    name: "Test Group",
    description: "Test description",
  };

  const updatedGroupData = {
    name: "Updated Group Name",
    description: "Updated group description",
  };

  // Initial setup - login admin user
  beforeAll(async () => {
    const { user, accessToken } = await loginUser(TEST_EMAIL);

    adminUserId = user.id;
    adminAccessToken = accessToken;
  });

  // GROUP LIFECYCLE MANAGEMENT
  describe("Group Lifecycle Management", () => {
    // CREATE GROUP
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

    // READ GROUP
    describe("Read Group", () => {
      test("should retrieve group by ID for group members", async () => {
        const response = await request(app)
          .get(`/groups/${groupId}`)
          .set("Content-Type", "application/json")
          .set("Authorization", `Bearer ${adminAccessToken}`);

        console.log("GET GROUP:", JSON.stringify(response.body, null, 2));

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          id: groupId,
          created_by: adminUserId,
          name: groupData.name,
          description: groupData.description,
          created_at: expect.any(String),
        });
      });
    });

    // UPDATE GROUP
    describe("Update Group", () => {
      test("should update group details for admin users", async () => {
        const response = await request(app)
          .patch(`/groups/${groupId}`)
          .send(updatedGroupData)
          .set("Content-Type", "application/json")
          .set("Authorization", `Bearer ${adminAccessToken}`);

        console.log("UPDATE GROUP:", JSON.stringify(response.body, null, 2));

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          name: updatedGroupData.name,
          description: updatedGroupData.description,
          updated_at: expect.any(String),
        });
      });
    });
  });

  // MEMBER MANAGEMENT
  describe("Member Management", () => {
    describe("Setup - Register and Add Member", () => {
      // REGISTER NEW USER
      test("should register a new user for testing", async () => {
        const { userId, email } = await registerUser();

        memberId = userId;
        memberEmail = email;

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

    describe("Role Management - Authorised Actions", () => {
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
        const { accessToken, user } = await loginUser(memberEmail);

        memberAccessToken = accessToken;

        expect(user.id).toBe(memberId);
        expect(memberAccessToken).toBeDefined();
      });
    });

    describe("Member Attempting Admin Actions", () => {
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

      // NON ADMIN MEMBER UPDATE GROUP
      test("should deny member access to update group", async () => {
        const response = await request(app)
          .patch(`/groups/${groupId}`)
          .send(updatedGroupData)
          .set("Content-Type", "application/json")
          .set("Authorization", `Bearer ${memberAccessToken}`);

        console.log(
          "UNAUTHORISED GROUP UPDATE:",
          JSON.stringify(response.body, null, 2)
        );

        expect(response.status).toBe(403);
        expect(response.body.error).toBeDefined();
        expect(response.body.code).toBe("PERMISSION_DENIED");
      });

      // NON ADMIN MEMBER DELETE GROUP
      test("should deny member access to delete group", async () => {
        const response = await request(app)
          .delete(`/groups/${groupId}`)
          .set("Content-Type", "application/json")
          .set("Authorization", `Bearer ${memberAccessToken}`);

        console.log(
          "UNAUTHORISED GROUP DELETE:",
          JSON.stringify(response.body, null, 2)
        );

        expect(response.status).toBe(403);
        expect(response.body.error).toBeDefined();
        expect(response.body.code).toBe("PERMISSION_DENIED");
      });
    });

    // NON MEMBER ACCESS ATTEMPTS
    describe("Non-Member Access Attempts", () => {
      // REGISTER NON MEMBER USER
      test("should register a non-member user", async () => {
        const { userId, email } = await registerUser();

        nonMemberId = userId;
        nonMemberEmail = email;

        expect(nonMemberId).toBeDefined();
        expect(nonMemberEmail).toBeDefined();
      });

      // LOGIN NON MEMBER USER
      test("should login as non-member", async () => {
        const { accessToken, user } = await loginUser(nonMemberEmail);

        nonMemberAccessToken = accessToken;

        expect(user.id).toBe(nonMemberId);
        expect(nonMemberAccessToken).toBeDefined();
      });

      // NON MEMBER GET GROUP
      test("should deny non-member access to group", async () => {
        const response = await request(app)
          .get(`/groups/${groupId}`)
          .set("Content-Type", "application/json")
          .set("Authorization", `Bearer ${nonMemberAccessToken}`);

        console.log(
          "UNAUTHORISED GROUP ACCESS:",
          JSON.stringify(response.body, null, 2)
        );

        expect(response.status).toBe(403);
        expect(response.body.error).toBeDefined();
        expect(response.body.code).toBe("PERMISSION_DENIED");
      });
    });
  });

  // CLEANUP - DELETE GROUP
  describe("Cleanup", () => {
    test("should delete group successfully", async () => {
      const response = await request(app)
        .delete(`/groups/${groupId}`)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${adminAccessToken}`);

      console.log("DELETE GROUP:", JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: groupId,
        name: updatedGroupData.name,
      });
    });
  });
});
