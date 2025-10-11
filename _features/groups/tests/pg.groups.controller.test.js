const request = require("supertest");
const app = require("../../../app");
const dotenv = require("dotenv");
const { loginUser, registerUser, addMember } = require("../../../_shared/helpers/testSetup");

dotenv.config();

const TEST_EMAIL = process.env.TEST_USER_1;

describe("Groups API Integration Tests - Authorised Actions (as Admin or Member)", () => {
  let adminAccessToken;
  let adminUserId;
  let groupId;
  let memberId;
  let memberAccessToken;

  const groupData = {
    name: "Test Group",
    description: "Test description",
  };

  const updatedGroupData = {
    name: "Updated Group Name",
    description: "Updated group description",
  };

  // Initial setup: Login as admin
  beforeAll(async () => {
    const { user, accessToken } = await loginUser(TEST_EMAIL);
    adminUserId = user.id;
    adminAccessToken = accessToken;
  });

  // CREATE GROUP
  describe("Create Group", () => {
    test("should create a new group successfully", async () => {
      const response = await request(app)
        .post("/groups")
        .send(groupData)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${adminAccessToken}`);

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

    // Missing data test
    test("should fail to create group with missing data", async () => {
      const response = await request(app)
        .post("/groups")
        .send({ name: "", description: "" }) // Missing required fields
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${adminAccessToken}`);

      console.log("CREATE GROUP with missing data:", JSON.stringify(response, null, 2));

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    // Invalid URL test
    test("should fail to create group with invalid req url", async () => {
      const response = await request(app)
        .post("/groupz") // Invalid endpoint
        .send(groupData)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${adminAccessToken}`);

      console.log("CREATE GROUP with invalid URL:", JSON.stringify(response, null, 2));

      expect(response.status).toBe(404);
    });
  });

  // READ GROUP (as admin)
  describe("Read Group (as Admin)", () => {
    test("should retrieve group by ID", async () => {
      const response = await request(app)
        .get(`/groups/${groupId}`)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${adminAccessToken}`);

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

  // UPDATE GROUP (as admin)
  describe("Update Group (as Admin)", () => {
    test("should update group details", async () => {
      const response = await request(app)
        .patch(`/groups/${groupId}`)
        .send(updatedGroupData)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${adminAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        name: updatedGroupData.name,
        description: updatedGroupData.description,
        updated_at: expect.any(String),
      });
    });

    // Missing data test
    test("should fail to update group - missing data", async () => {
      const response = await request(app)
        .patch(`/groups/${groupId}`)
        .send({ name: "", description: "" }) // Missing required fields
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${adminAccessToken}`);

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });
  });

  // MEMBER ACCESS - READ GROUP (as non-admin member)
  describe("Read Group (as Non-Admin Member)", () => {
    test("should allow non-admin member to access group", async () => {
      // Register and login a new user
      const { email, userId } = await registerUser();
      memberId = userId;
      const { accessToken } = await loginUser(email);
      memberAccessToken = accessToken;

      // Add user as non-admin member to the group
      const { success, role } = await addMember(groupId, memberId, adminAccessToken);
      expect(success).toBe(true);
      expect(role.is_admin).toBe(false);

      // Member attempts to access the group
      const response = await request(app)
        .get(`/groups/${groupId}`)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${memberAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: groupId,
        created_by: adminUserId,
        name: updatedGroupData.name,
        description: updatedGroupData.description,
        created_at: expect.any(String),
      });
    });
  });

  // DELETE GROUP (as admin)
  describe("Cleanup", () => {
    test("should delete the group", async () => {
      const response = await request(app)
        .delete(`/groups/${groupId}`)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${adminAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: groupId,
        name: updatedGroupData.name,
      });
    });
  });
});
