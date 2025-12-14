const request = require("supertest");
const app = require("../../../app");
const dotenv = require("dotenv");
const {
  loginUser,
  registerUser,
  addMember,
  createGroup,
} = require("../../../_shared/helpers/testSetup");

dotenv.config();

const INVALID_USER_ID = "00000000-0000-0000-0000-000000000000"; // Valid UUID but non-existent user

describe("Members API Integration Tests - Authorised Actions (as Admin or Member)", () => {
  let groupCreatorAccessToken;
  let groupCreatorId;
  let groupId;
  let nonAdminAccessToken;
  let nonAdminUserId;
  let newMemberId;

  const groupData = {
    name: "Test Group",
    description: "Test description",
  };

  // Initial setup: Login as group creator, create group, add non-admin member, register non-member
  beforeAll(async () => {
    // Register admin/creator user
    const { userId, email } = await registerUser();
    groupCreatorId = userId;
    const { accessToken } = await loginUser(email);
    groupCreatorAccessToken = accessToken;

    // Create group as admin
    groupId = await createGroup(groupData, groupCreatorAccessToken);

    // Register member user
    const { email: naEmail, userId: naUserId } = await registerUser();
    nonAdminUserId = naUserId;
    nonAdminAccessToken = (await loginUser(naEmail)).accessToken;

    // Add member to group
    const { success, role } = await addMember(groupId, nonAdminUserId, groupCreatorAccessToken);
    expect(success).toBe(true);
    expect(role.is_admin).toBe(false);
  });

  // Cleanup: Delete the created group
  afterAll(async () => {
    if (groupId) {
      await request(app)
        .delete(`/groups/${groupId}`)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${groupCreatorAccessToken}`);
    }
  });

  // GET GROUP MEMBERS
  describe("Get Group Members", () => {
    test.each([
      { role: "admin", token: () => groupCreatorAccessToken },
      { role: "non-admin member", token: () => nonAdminAccessToken },
    ])("should allow $role to fetch group members", async ({ role, token }) => {
      const response = await request(app)
        .get(`/groups/${groupId}/members`)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${token()}`);

      console.log(`GET GROUP MEMBERS (as ${role}):`, JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toMatchObject({
        user_id: expect.any(String),
        group_id: groupId,
        first_name: expect.any(String),
        last_name: expect.any(String),
        email: expect.any(String),
        is_admin: expect.any(Boolean),
        joined_at: expect.any(String),
      });

      const groupIds = response.body.data.map((member) => member.group_id);
      groupIds.forEach((id) => expect(id).toBe(groupId));
    });
  });

  // GET GROUP MEMBER BY ID
  describe("Get Group Member By ID", () => {
    test.each([
      {
        role: "admin",
        userId: () => nonAdminUserId,
        token: () => groupCreatorAccessToken,
      },
      {
        role: "non-admin member",
        userId: () => groupCreatorId,
        token: () => nonAdminAccessToken,
      },
    ])("should allow $role to fetch group member by ID", async ({ role, userId, token }) => {
      const response = await request(app)
        .get(`/groups/${groupId}/members/${userId()}`)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${token()}`);

      console.log(
        `GET GROUP MEMBER ${userId()} (as ${role}):`,
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        user_id: expect.any(String),
        group_id: groupId,
        first_name: expect.any(String),
        last_name: expect.any(String),
        email: expect.any(String),
        is_admin: expect.any(Boolean),
        joined_at: expect.any(String),
      });
      expect(response.body.data.user_id).toBe(userId());
      expect(response.body.data.group_id).toBe(groupId);
    });

    // Member not found test
    test("should return 404 for non-existent user", async () => {
      const nonExistentUserId = INVALID_USER_ID; // Valid UUID but non-existent
      const response = await request(app)
        .get(`/groups/${groupId}/members/${nonExistentUserId}`)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${groupCreatorAccessToken}`);

      console.log(
        "GET GROUP MEMBER with non-existent userId (as admin):",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
      expect(response.body.code).toBe("NOT_FOUND");
    });
  });

  // ADD MEMBER
  describe("Add Member to Group (as admin)", () => {
    // Register a new user to be added as member
    beforeAll(async () => {
      const { userId } = await registerUser();
      newMemberId = userId;
    });

    // Valid input test
    test("should allow admin to add a new member to the group", async () => {
      const response = await request(app)
        .post(`/groups/${groupId}/members/add-member`)
        .send({ userIdToAdd: newMemberId })
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${groupCreatorAccessToken}`);

      console.log("ADD MEMBER (as admin):", JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.member).toMatchObject({
        user_id: newMemberId,
        group_id: groupId,
        joined_at: expect.any(String),
      });
      expect(response.body.data.role).toMatchObject({
        is_admin: false,
      });
    });

    // Invalid input test
    test("should prevent adding a member with invalid userId format", async () => {
      const response = await request(app)
        .post(`/groups/${groupId}/members/add-member`)
        .send({ userIdToAdd: "invalid-uuid" })
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${groupCreatorAccessToken}`);

      console.log(
        "ADD MEMBER with invalid userId format (as admin):",
        JSON.stringify({ status: response.status, errors: response.body.errors }, null, 2)
      );

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    // Duplicate member test
    test("should prevent adding a user who is already a member", async () => {
      const response = await request(app)
        .post(`/groups/${groupId}/members/add-member`)
        .send({ userIdToAdd: newMemberId }) // Same user as before
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${groupCreatorAccessToken}`);

      console.log(
        "ADD MEMBER who is already a member (as admin):",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.body.success).toBe(false);
      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });

    // Non-existent user test
    test("should prevent adding a non-existent user as member", async () => {
      const nonExistentUserId = INVALID_USER_ID; // Valid UUID but non-existent
      const response = await request(app)
        .post(`/groups/${groupId}/members/add-member`)
        .send({ userIdToAdd: nonExistentUserId })
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${groupCreatorAccessToken}`);

      console.log(
        "ADD MEMBER who is not a valid user (as admin):",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.body.success).toBe(false);
      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });
  });

  // UPDATE MEMBER ROLE
  describe("Update Member Role (as admin)", () => {
    test.each([
      {
        setIsAdmin: true,
      },
      {
        setIsAdmin: false,
      },
    ])(
      "should allow admin to promote and demote a members role (set isAdmin: $setIsAdmin)",
      async ({ setIsAdmin }) => {
        const response = await request(app)
          .patch(`/groups/${groupId}/members/role`)
          .send({ userId: nonAdminUserId, isAdmin: setIsAdmin })
          .set("Content-Type", "application/json")
          .set("Authorization", `Bearer ${groupCreatorAccessToken}`);

        console.log(
          `UPDATE MEMBER ROLE to isAdmin=${setIsAdmin} (as admin):`,
          JSON.stringify(response.body, null, 2)
        );

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          user_id: nonAdminUserId,
          group_id: groupId,
          is_admin: setIsAdmin,
        });
      }
    );

    // Invalid input tests
    test.each([
      {
        condition: "invalid userId format",
        userId: () => "invalid-uuid", // Invalid UUID format
        isAdmin: true, // Valid boolean
      },
      {
        condition: "invalid isAdmin format",
        userId: () => nonAdminUserId, // Valid UUID
        isAdmin: "not-a-boolean", // Invalid boolean format
      },
    ])(
      "should fail to update member role with condition: $condition",
      async ({ condition, userId, isAdmin }) => {
        const response = await request(app)
          .patch(`/groups/${groupId}/members/role`)
          .send({ userId: userId(), isAdmin: isAdmin })
          .set("Content-Type", "application/json")
          .set("Authorization", `Bearer ${groupCreatorAccessToken}`);

        console.log(
          `UPDATE MEMBER ROLE with condition: ${condition} (as admin):`,
          JSON.stringify({ status: response.status, errors: response.body.errors }, null, 2)
        );

        expect(response.status).toBe(400);
        expect(response.body.errors).toBeDefined();
      }
    );

    // Non-existent user test
    test("should prevent updating role for a non-existent user", async () => {
      const nonExistentUserId = INVALID_USER_ID; // Valid UUID but non-existent
      const response = await request(app)
        .patch(`/groups/${groupId}/members/role`)
        .send({ userId: nonExistentUserId, isAdmin: true })
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${groupCreatorAccessToken}`);

      console.log(
        "UPDATE MEMBER ROLE who is not a valid user (as admin):",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.body.success).toBe(false);
      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
    });
  });

  // REMOVE MEMBER
  describe("Remove Member from Group (as admin)", () => {
    test("should allow admin to remove a member from the group", async () => {
      const response = await request(app)
        .delete(`/groups/${groupId}/members/remove`)
        .send({ userId: newMemberId })
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${groupCreatorAccessToken}`);

      console.log("REMOVE MEMBER (as admin):", JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        user_id: newMemberId,
        group_id: groupId,
        joined_at: expect.any(String),
      });
    });

    // Invalid input test
    test("should prevent removing a member with invalid userId format", async () => {
      const response = await request(app)
        .delete(`/groups/${groupId}/members/remove`)
        .send({ userId: "invalid-uuid" })
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${groupCreatorAccessToken}`);

      console.log(
        "REMOVE MEMBER with invalid userId format (as admin):",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    // Non-existent member test
    test("should prevent removing a non-member user from the group", async () => {
      const nonMemberUserId = INVALID_USER_ID; // Valid UUID but non-member
      const response = await request(app)
        .delete(`/groups/${groupId}/members/remove`)
        .send({ userId: nonMemberUserId })
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${groupCreatorAccessToken}`);

      console.log(
        "REMOVE MEMBER who is not a member (as admin):",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.body.success).toBe(false);
      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
    });
  });
});
