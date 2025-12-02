const request = require("supertest");
const app = require("../../../../app");
const {
  createGroup,
  loginUser,
  registerUser,
  addMember,
} = require("../../../../../_shared/helpers/testSetup");

let adminUserId;
let adminAccessToken;
let groupId;
let memberId;
let memberAccessToken;

const groupData = {
  name: "Test Group",
  description: "Test description",
};

describe("Media Comments Controller Integration Tests - Authorised Actions", () => {
  // Initial setup
  beforeAll(async () => {
    // Register and login admin user
    const { userId, email } = await registerUser();
    adminUserId = userId;
    const { accessToken } = await loginUser(email);
    adminAccessToken = accessToken;

    // Create group as admin
    groupId = await createGroup(groupData, adminAccessToken);

    // Register and login member user
    const { email: naEmail, userId: naUserId } = await registerUser();
    memberId = naUserId;
    memberAccessToken = (await loginUser(naEmail)).accessToken;

    // Add member to group
    const { success, role } = await addMember(groupId, memberId, adminAccessToken);
    expect(success).toBe(true);
    expect(role.is_admin).toBe(false);
  });

  // Cleanup: Delete the created group
  afterAll(async () => {
    if (groupId) {
      console.log("CLEANUP: Deleting test group with ID:", groupId);

      await request(app)
        .delete(`/groups/${groupId}`)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${adminAccessToken}`);
    }
  });
});
