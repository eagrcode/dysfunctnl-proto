const request = require("supertest");
const app = require("../../../app");
const dotenv = require("dotenv");
const {
  createGroup,
  loginUser,
  registerUser,
  addMember,
} = require("../../../_shared/helpers/testSetup");

dotenv.config();

const TEST_EMAIL = process.env.TEST_USER_1;

describe("Calendar API Integration Tests - Authorised Actions", () => {
  let adminAccessToken;
  let adminUserId;
  let groupId;
  let memberId;
  let memberAccessToken;
  let memberCreatedAlbumId;
  let adminCreatedAlbumId;

  const groupData = {
    name: "Test Group",
    description: "Test description",
  };

  // Initial setup
  beforeAll(async () => {
    const { user, accessToken } = await loginUser(TEST_EMAIL);
    adminUserId = user.id;
    adminAccessToken = accessToken;

    groupId = await createGroup(groupData, adminAccessToken);

    const { email: naEmail, userId: naUserId } = await registerUser();
    memberId = naUserId;

    memberAccessToken = (await loginUser(naEmail)).accessToken;

    const { success, role } = await addMember(
      groupId,
      memberId,
      adminAccessToken
    );
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

  // CREATE ALBUM
  describe("CREATE ALBUM", () => {
    test.each([
      {
        role: "Admin",
        userId: () => adminUserId,
        accessToken: () => adminAccessToken,
      },
      {
        role: "Member",
        userId: () => memberId,
        accessToken: () => memberAccessToken,
      },
    ])(
      "Should allow $role to create an album",
      async ({ role, userId, accessToken }) => {
        const albumData = {
          name: `Test Album by ${role}`,
          description: "This is a test album",
          createdBy: userId(),
        };

        const response = await request(app)
          .post(`/groups/${groupId}/albums`)
          .send(albumData)
          .set("Content-Type", "application/json")
          .set("Authorization", `Bearer ${accessToken()}`);

        console.log(
          `CREATE ALBUM RESPONSE: ${role}`,
          JSON.stringify(response.body, null, 2)
        );

        if (role === "Member") {
          memberCreatedAlbumId = response.body.data.id;
        }

        if (role === "Admin") {
          adminCreatedAlbumId = response.body.data.id;
        }

        expect(response.statusCode).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          id: expect.any(String),
          group_id: groupId,
          name: albumData.name,
          description: albumData.description,
          created_by: albumData.createdBy,
          created_at: expect.any(String),
          updated_at: null,
        });
      }
    );
  });

  // GET ALL ALBUMS
  describe("GET ALL ALBUMS", () => {
    test.each([
      {
        role: "Admin",
        accessToken: () => adminAccessToken,
      },
      {
        role: "Member",
        accessToken: () => memberAccessToken,
      },
    ])(
      "Should allow $role to get all albums",
      async ({ role, accessToken }) => {
        const response = await request(app)
          .get(`/groups/${groupId}/albums`)
          .set("Content-Type", "application/json")
          .set("Authorization", `Bearer ${accessToken()}`);

        console.log(
          `GET ALL ALBUMS RESPONSE: ${role}`,
          JSON.stringify(response.body, null, 2)
        );

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data).toEqual(
          expect.arrayOf(
            expect.objectContaining({
              id: expect.any(String),
              group_id: groupId,
              name: expect.any(String),
              description: expect.any(String),
              created_by: expect.any(String),
              created_at: expect.any(String),
              updated_at: null,
            })
          )
        );
      }
    );
  });

  // GET ALBUM BY ID
  describe("GET ALBUM BY ID", () => {
    test.each([
      {
        role: "Admin",
        accessToken: () => adminAccessToken,
        albumId: () => adminCreatedAlbumId,
      },
      {
        role: "Member",
        accessToken: () => memberAccessToken,
        albumId: () => memberCreatedAlbumId,
      },
    ])(
      "Should allow $role to get album by ID",
      async ({ role, accessToken, albumId }) => {
        const response = await request(app)
          .get(`/groups/${groupId}/albums/${albumId()}`)
          .set("Content-Type", "application/json")
          .set("Authorization", `Bearer ${accessToken()}`);

        console.log(
          `GET ALBUM BY ID RESPONSE: ${role}`,
          JSON.stringify(response.body, null, 2)
        );

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          id: albumId(),
          group_id: groupId,
          name: expect.any(String),
          description: expect.any(String),
          created_by: expect.any(String),
          created_at: expect.any(String),
          updated_at: null,
        });
      }
    );
  });

  // UPDATE ALBUM BY ID
  describe("UPDATE ALBUM BY ID", () => {
    test.each([
      {
        role: "Admin",
        accessToken: () => adminAccessToken,
      },
      {
        role: "Member",
        accessToken: () => memberAccessToken,
      },
    ])(
      "Should allow $role to update album by ID",
      async ({ role, accessToken }) => {
        const updatedData = {
          name: `Updated Album Name by ${role}`,
          description: `Updated description by ${role}`,
        };

        const response = await request(app)
          .patch(`/groups/${groupId}/albums/${memberCreatedAlbumId}`)
          .send(updatedData)
          .set("Content-Type", "application/json")
          .set("Authorization", `Bearer ${accessToken()}`);

        console.log(
          `UPDATE ALBUM BY ID RESPONSE: ${role}`,
          JSON.stringify(response.body, null, 2)
        );

        expect(response.statusCode).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.updated_at).toBeDefined();
        expect(response.body.data).toMatchObject({
          id: memberCreatedAlbumId,
          group_id: groupId,
          name: updatedData.name,
          description: updatedData.description,
          created_by: expect.any(String),
          created_at: expect.any(String),
          updated_at: expect.any(String),
        });
      }
    );
  });

  // DELETE ALBUM BY ID
  describe("DELETE ALBUM BY ID", () => {
    test.each([
      {
        role: "Admin",
        accessToken: () => adminAccessToken,
        albumId: () => adminCreatedAlbumId,
      },
      {
        role: "Member",
        accessToken: () => memberAccessToken,
        albumId: () => memberCreatedAlbumId,
      },
    ])(
      "Should allow $role to delete album by ID",
      async ({ role, accessToken, albumId }) => {
        const response = await request(app)
          .delete(`/groups/${groupId}/albums/${albumId()}`)
          .set("Content-Type", "application/json")
          .set("Authorization", `Bearer ${accessToken()}`);

        console.log(
          `DELETE ALBUM BY ID RESPONSE: ${role}`,
          JSON.stringify(response.body, null, 2)
        );

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(albumId());
      }
    );
  });
});
