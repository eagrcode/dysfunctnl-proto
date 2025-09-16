const request = require("supertest");
const app = require("../../../app");
const dotenv = require("dotenv");
const {
  registerUser,
  loginUser,
  createGroup,
  addMember,
} = require("../../helpers/setup");

dotenv.config();

describe("Group Controller - Unauthorised Actions", () => {
  let groupCreatorAccessToken;
  let groupCreatorId;
  let groupId;
  let nonMemberAccessToken;
  let nonMemberEmail;
  let nonAdminAccessToken;
  let nonAdminUserId;

  const groupData = {
    name: "Test Group",
    description: "Test description",
  };

  // Initial setup: Login as group creator, create group, add non-admin member, register non-member
  beforeAll(async () => {
    // Login as group creator and create a group
    const { user, accessToken } = await loginUser(process.env.TEST_USER_1);
    groupCreatorId = user.id;
    groupCreatorAccessToken = accessToken;

    groupId = await createGroup(groupData, groupCreatorAccessToken);

    // Register, login, and add non-admin member to group
    const { email: naEmail, userId: naUserId } = await registerUser();
    nonAdminUserId = naUserId;

    nonAdminAccessToken = (await loginUser(naEmail)).accessToken;

    const { success, role } = await addMember(
      groupId,
      nonAdminUserId,
      groupCreatorAccessToken
    );
    expect(success).toBe(true);
    expect(role.is_admin).toBe(false);

    // Register and login non-member
    const { email: nmEmail } = await registerUser();
    nonMemberEmail = nmEmail;
    nonMemberAccessToken = (await loginUser(nonMemberEmail)).accessToken;
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

  // NON-ADMIN MEMBER ACCESS ATTEMPTS
  describe("Non-Admin Member Access Attempts", () => {
    // UPDATE GROUP
    test("should deny non-admin group update", async () => {
      const response = await request(app)
        .patch(`/groups/${groupId}`)
        .send({ name: "Unauthorized Update" })
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${nonAdminAccessToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBeDefined();
      expect(response.body.code).toBe("PERMISSION_DENIED");
    });

    // DELETE GROUP
    test("should deny non-admin group deletion", async () => {
      const response = await request(app)
        .delete(`/groups/${groupId}`)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${nonAdminAccessToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBeDefined();
      expect(response.body.code).toBe("PERMISSION_DENIED");
    });
  });

  // NON-MEMBER ACCESS ATTEMPTS
  describe("Non-Member Access Attempts", () => {
    // READ GROUP
    test("should deny non-member access to group", async () => {
      const response = await request(app)
        .get(`/groups/${groupId}`)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${nonMemberAccessToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBeDefined();
      expect(response.body.code).toBe("PERMISSION_DENIED");
    });

    // UPDATE GROUP
    test("should deny non-member group update", async () => {
      const response = await request(app)
        .patch(`/groups/${groupId}`)
        .send({ name: "Unauthorized Update" })
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${nonMemberAccessToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBeDefined();
      expect(response.body.code).toBe("PERMISSION_DENIED");
    });

    // DELETE GROUP
    test("should deny non-member group deletion", async () => {
      const response = await request(app)
        .delete(`/groups/${groupId}`)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${nonMemberAccessToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBeDefined();
      expect(response.body.code).toBe("PERMISSION_DENIED");
    });
  });
});
