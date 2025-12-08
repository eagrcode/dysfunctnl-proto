const request = require("supertest");
const app = require("../../../../app");
const dotenv = require("dotenv");
const uploadConfig = require("../../../../_shared/utils/uploadConfig");
const {
  createGroup,
  loginUser,
  registerUser,
  addMember,
} = require("../../../../_shared/helpers/testSetup");

dotenv.config();

let adminAccessToken;
let adminUserId;
let groupId;
let memberId;
let memberAccessToken;
let memberCreatedAlbumId;
let adminCreatedAlbumId;
let mediaUrls;
let adminUploadedMediaId;
let memberUploadedMediaId;

describe("Media Upload API Integration Tests - Authorised Actions", () => {
  const groupData = {
    name: "Test Group",
    description: "Test description",
  };

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
    ])("Should allow $role to create an album", async ({ role, userId, accessToken }) => {
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

      console.log(`CREATE ALBUM RESPONSE: ${role}`, JSON.stringify(response.body, null, 2));

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
    });
  });

  // UPLOAD IMAGE TO ALBUM
  describe("UPLOAD IMAGE TO ALBUM", () => {
    test.each([
      {
        role: "Admin",
        albumId: () => adminCreatedAlbumId,
        accessToken: () => adminAccessToken,
      },

      {
        role: "Member",
        albumId: () => memberCreatedAlbumId,
        accessToken: () => memberAccessToken,
      },
    ])(
      "Should allow $role to upload an image to their album",
      async ({ role, albumId, accessToken }) => {
        const response = await request(app)
          .post(`/groups/${groupId}/albums/${albumId()}/media/upload`)
          .set("Authorization", `Bearer ${accessToken()}`)
          .attach("image", "_test-images/test-image.jpg");

        console.log(`UPLOAD IMAGE RESPONSE: ${role}`, JSON.stringify(response.body, null, 2));

        mediaUrls = response.body.data.urls;

        role === "Admin"
          ? (adminUploadedMediaId = response.body.data.id)
          : (memberUploadedMediaId = response.body.data.id);

        expect(response.statusCode).toBe(201);
        expect(response.body.success).toBe(true);
        expect(uploadConfig.allowedTypes.image).toContain(response.body.data.mime_type);
        expect(parseInt(response.body.data.size_bytes)).toBeLessThanOrEqual(
          uploadConfig.limits.image
        );
        expect(response.body.data).toMatchObject({
          id: expect.any(String),
          album_id: albumId(),
          group_id: groupId,
          uploaded_by: expect.any(String),
          type: "image",
          mime_type: expect.stringContaining("image/"),
          size_bytes: expect.any(String),
          filename: expect.any(String),
          created_at: expect.any(String),
          updated_at: null,
          urls: {
            thumb: expect.stringContaining("/media/thumbs/"),
            display: expect.stringContaining("/media/display/"),
            original: expect.stringContaining("/media/original/"),
          },
        });
      }
    );
  });

  // GET UPLOADED IMAGE METADATA
  describe("GET UPLOADED IMAGE METADATA", () => {
    test.each([
      {
        role: "Admin",
        albumId: () => adminCreatedAlbumId,
        accessToken: () => adminAccessToken,
        mediaId: () => adminUploadedMediaId,
      },
      {
        role: "Member",
        albumId: () => memberCreatedAlbumId,
        accessToken: () => memberAccessToken,
        mediaId: () => memberUploadedMediaId,
      },
    ])(
      "Should allow $role to get metadata of uploaded image",
      async ({ role, albumId, accessToken, mediaId }) => {
        const response = await request(app)
          .get(`/groups/${groupId}/albums/${albumId()}/media/${mediaId()}`)
          .set("Authorization", `Bearer ${accessToken()}`);

        console.log(`GET IMAGE METADATA RESPONSE: ${role}`, JSON.stringify(response.body, null, 2));

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          id: expect.any(String),
          album_id: albumId(),
          group_id: groupId,
          uploaded_by: expect.any(String),
          type: "image",
          mime_type: expect.stringContaining("image/"),
          size_bytes: expect.any(String),
          filename: expect.any(String),
          created_at: expect.any(String),
          updated_at: null,
          urls: {
            thumb: expect.stringContaining("/media/thumbs/"),
            display: expect.stringContaining("/media/display/"),
            original: expect.stringContaining("/media/original/"),
          },
        });
      }
    );
  });

  // GET IMAGE WITH COMMENTS
  describe("GET IMAGE WITH COMMENTS", () => {
    test.each([
      {
        role: "Admin",
        albumId: () => adminCreatedAlbumId,
        accessToken: () => adminAccessToken,
        mediaId: () => adminUploadedMediaId,
      },
      {
        role: "Member",
        albumId: () => memberCreatedAlbumId,
        accessToken: () => memberAccessToken,
        mediaId: () => memberUploadedMediaId,
      },
    ])(
      "Should allow $role to get image with comments",
      async ({ role, albumId, accessToken, mediaId }) => {
        const response = await request(app)
          .get(`/groups/${groupId}/albums/${albumId()}/media/${mediaId()}/comments`)
          .set("Authorization", `Bearer ${accessToken()}`);

        console.log(
          `GET IMAGE WITH COMMENTS RESPONSE: ${role}`,
          JSON.stringify(response.body, null, 2)
        );

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.comments)).toBe(true);
        expect(response.body.data).toMatchObject({
          id: expect.any(String),
          album_id: albumId(),
          group_id: groupId,
          uploaded_by: expect.any(String),
          type: "image",
          mime_type: expect.stringContaining("image/"),
          size_bytes: expect.any(String),
          filename: expect.any(String),
          created_at: expect.any(String),
          updated_at: null,
          urls: {
            thumb: expect.stringContaining("/media/thumbs/"),
            display: expect.stringContaining("/media/display/"),
            original: expect.stringContaining("/media/original/"),
          },
          comments: expect.any(Array),
        });
      }
    );
  });

  // SERVE UPLOADED IMAGE
  describe("SERVE UPLOADED IMAGE", () => {
    test.each([
      { role: "Admin", url: () => mediaUrls.original },
      { role: "Member", url: () => mediaUrls.display },
      { role: "Member", url: () => mediaUrls.thumb },
    ])("Should serve the uploaded image for $role", async ({ role, url }) => {
      const response = await request(app).get(url());

      console.log(`SERVE UPLOADED IMAGE RESPONSE: ${role}`, {
        status: response.statusCode,
        headers: response.headers,
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toMatch(/image\/jpeg/);
    });
  });

  // DELETE UPLOADED IMAGE
  describe("DELETE UPLOADED IMAGE", () => {
    test.each([
      {
        role: "Admin",
        albumId: () => adminCreatedAlbumId,
        accessToken: () => adminAccessToken,
        mediaId: () => adminUploadedMediaId,
      },
      {
        role: "Member",
        albumId: () => memberCreatedAlbumId,
        accessToken: () => memberAccessToken,
        mediaId: () => memberUploadedMediaId,
      },
    ])(
      "Should allow $role to delete their uploaded image",
      async ({ role, albumId, accessToken, mediaId }) => {
        const response = await request(app)
          .delete(`/groups/${groupId}/albums/${albumId()}/media/${mediaId()}`)
          .set("Authorization", `Bearer ${accessToken()}`);

        console.log(
          `DELETE UPLOADED IMAGE RESPONSE: ${role}`,
          JSON.stringify(response.body, null, 2)
        );

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
      }
    );
  });
});
