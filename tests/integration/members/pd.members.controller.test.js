const request = require("supertest");
const app = require("../../../app");
const dotenv = require("dotenv");
const {
  loginUser,
  registerUser,
  addMember,
  createGroup,
} = require("../../helpers/setup");

dotenv.config();

describe("List Controller - Unauthorised Actions", () => {
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

  // ADD MEMBER
  describe("Add Member to Group (as non-admin)", () => {
    // Register a new user to be added as member
    beforeAll(async () => {
      const { userId } = await registerUser();
      newMemberId = userId;
    });

    test("should deny non-admin member to add a new member to the group", async () => {
      const response = await request(app)
        .post(`/groups/${groupId}/members/add-member`)
        .send({ userIdToAdd: newMemberId })
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${nonMemberAccessToken}`);

      console.log(
        "ADD MEMBER (as non-admin):",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(403);
      expect(response.body.error).toBeDefined();
      expect(response.body.code).toBe("PERMISSION_DENIED");
    });
  });

  // UPDATE MEMBER ROLE
  describe("Update Member Role (as non-admin)", () => {
    test.each([
      {
        setIsAdmin: true,
      },
      {
        setIsAdmin: false,
      },
    ])(
      "should deny non-admin to promote and demote a members role (set isAdmin: $setIsAdmin)",
      async ({ setIsAdmin }) => {
        const response = await request(app)
          .patch(`/groups/${groupId}/members/role`)
          .send({ userId: nonAdminUserId, isAdmin: setIsAdmin })
          .set("Content-Type", "application/json")
          .set("Authorization", `Bearer ${nonAdminAccessToken}`);

        console.log(
          `UPDATE MEMBER ROLE to isAdmin=${setIsAdmin} (as non-admin):`,
          JSON.stringify(response.body, null, 2)
        );

        expect(response.status).toBe(403);
        expect(response.body.error).toBeDefined();
        expect(response.body.code).toBe("PERMISSION_DENIED");
      }
    );
  });

  // REMOVE MEMBER
  describe("Remove Member from Group (as non-admin)", () => {
    test("should deny non-admin to remove a member from the group", async () => {
      const response = await request(app)
        .delete(`/groups/${groupId}/members/remove`)
        .send({ userId: newMemberId })
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${nonAdminAccessToken}`);

      console.log(
        "REMOVE MEMBER (as non-admin):",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(403);
      expect(response.body.error).toBeDefined();
      expect(response.body.code).toBe("PERMISSION_DENIED");
    });
  });
});
