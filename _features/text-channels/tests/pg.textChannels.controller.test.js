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

describe("Text Channels/Messages Integration Tests - Authorised Actions", () => {
  let adminAccessToken;
  let adminUserId;
  let groupId;
  let memberId;
  let memberAccessToken;
  let adminCreatedChannelId;
  let memberCreatedChannelId;
  let memberCreatedMessageId;
  let adminCreatedMessageId;

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

  describe("Text Channels Controller - Admin and Member Actions", () => {
    // CREATE TEXT CHANNEL
    describe("CREATE Text Channel - POST /groups/:groupId/text-channels", () => {
      test("should allow an admin to create a text channel", async () => {
        const channelName = "Admin Created Channel";

        const response = await request(app)
          .post(`/groups/${groupId}/text-channels`)
          .set("Content-Type", "application/json")
          .set("Authorization", `Bearer ${adminAccessToken}`)
          .send({
            channelName: channelName,
          });

        console.log(
          `CREATE TEXT CHANNEL RESPONSE FOR ADMIN:`,
          JSON.stringify(response.body, null, 2)
        );

        adminCreatedChannelId = response.body.data.id;

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty("id");
        expect(response.body.data).toMatchObject({
          id: expect.any(String),
          group_id: groupId,
          name: channelName,
          created_at: expect.any(String),
          updated_at: null,
        });
      });
    });

    // GET ALL TEXT CHANNELS
    describe("GET All Text Channels - GET /groups/:groupId/text-channels", () => {
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
        "should allow a $role to get all text channels",
        async ({ accessToken, role }) => {
          const response = await request(app)
            .get(`/groups/${groupId}/text-channels`)
            .set("Content-Type", "application/json")
            .set("Authorization", `Bearer ${accessToken()}`);

          console.log(
            `GET ALL TEXT CHANNELS RESPONSE FOR ${role}:`,
            JSON.stringify(response.body, null, 2)
          );

          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(Array.isArray(response.body.data)).toBe(true);
          expect(response.body.data).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                id: expect.any(String),
                group_id: groupId,
                name: expect.any(String),
                created_at: expect.any(String),
                updated_at: null,
              }),
            ])
          );
        }
      );
    });

    // GET TEXT CHANNEL BY ID
    describe("GET Text Channel By ID - GET /groups/:groupId/text-channels/:textChannelId", () => {
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
        "should allow a $role to get a text channel by ID",
        async ({ accessToken, role }) => {
          const response = await request(app)
            .get(`/groups/${groupId}/text-channels/${adminCreatedChannelId}`)
            .set("Content-Type", "application/json")
            .set("Authorization", `Bearer ${accessToken()}`);

          console.log(
            `GET TEXT CHANNEL BY ID RESPONSE FOR ${role}:`,
            JSON.stringify(response.body, null, 2)
          );

          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(response.body.data).toMatchObject({
            id: adminCreatedChannelId,
            group_id: groupId,
            name: expect.any(String),
            created_at: expect.any(String),
            updated_at: null,
          });
        }
      );
    });

    // UPDATE TEXT CHANNEL
    describe("UPDATE Text Channel - PATCH /groups/:groupId/text-channels/:textChannelId", () => {
      test("should allow an admin to update a text channel", async () => {
        const newChannelName = "Updated Channel Name";

        const response = await request(app)
          .patch(`/groups/${groupId}/text-channels/${adminCreatedChannelId}`)
          .set("Content-Type", "application/json")
          .set("Authorization", `Bearer ${adminAccessToken}`)
          .send({
            channelName: newChannelName,
          });

        console.log(
          `UPDATE TEXT CHANNEL RESPONSE FOR ADMIN:`,
          JSON.stringify(response.body, null, 2)
        );

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          id: adminCreatedChannelId,
          group_id: groupId,
          name: newChannelName,
          created_at: expect.any(String),
          updated_at: expect.any(String),
        });
      });
    });
  });

  describe("Text Channel Messages Controller - Admin and Member Actions", () => {
    // SEND MESSAGE
    describe("SEND Message - POST /groups/:groupId/text-channels/:textChannelId/messages", () => {
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
        "should allow a $role to send a message in a text channel",
        async ({ accessToken, role }) => {
          const messageContent = `Hello from ${role}`;

          const response = await request(app)
            .post(
              `/groups/${groupId}/text-channels/${adminCreatedChannelId}/messages`
            )
            .set("Content-Type", "application/json")
            .set("Authorization", `Bearer ${accessToken()}`)
            .send({
              content: messageContent,
            });

          console.log(
            `SEND MESSAGE RESPONSE FOR ${role}:`,
            JSON.stringify(response.body, null, 2)
          );

          role === "Admin"
            ? (adminCreatedMessageId = response.body.data.id)
            : (memberCreatedMessageId = response.body.data.id);

          expect(response.status).toBe(201);
          expect(response.body.success).toBe(true);
          expect(response.body.data).toMatchObject({
            id: expect.any(String),
            created_at: expect.any(String),
          });
        }
      );
    });

    // GET ALL MESSAGES
    describe("GET All Messages - GET /groups/:groupId/text-channels/:textChannelId/messages", () => {
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
        "should allow a $role to get all messages in a text channel",
        async ({ accessToken, role }) => {
          const response = await request(app)
            .get(
              `/groups/${groupId}/text-channels/${adminCreatedChannelId}/messages`
            )
            .set("Content-Type", "application/json")
            .set("Authorization", `Bearer ${accessToken()}`);

          console.log(
            `GET ALL MESSAGES RESPONSE FOR ${role}:`,
            JSON.stringify(response.body, null, 2)
          );

          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(Array.isArray(response.body.data)).toBe(true);
          expect(response.body.data).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                id: expect.any(String),
                channel_id: adminCreatedChannelId,
                sender_id: expect.any(String),
                content: expect.any(String),
                created_at: expect.any(String),
                updated_at: null,
              }),
            ])
          );
        }
      );
    });

    // UPDATE MESSAGE
    describe("UPDATE Message - PATCH /groups/:groupId/text-channels/:textChannelId/messages/:messageId/update", () => {
      test.each([
        {
          role: "Admin",
          accessToken: () => adminAccessToken,
          messageId: () => adminCreatedMessageId,
          testDescription: "should allow an admin to update their own message",
          senderId: () => adminUserId,
        },
        {
          role: "Member",
          accessToken: () => memberAccessToken,
          messageId: () => memberCreatedMessageId,
          testDescription: "should allow a member to update their own message",
          senderId: () => memberId,
        },
        {
          role: "Admin",
          accessToken: () => adminAccessToken,
          messageId: () => memberCreatedMessageId,
          testDescription: "should allow an admin to update a member's message",
          senderId: () => memberId,
        },
      ])(
        "$testDescription",
        async ({ accessToken, role, messageId, senderId }) => {
          const newContent = `Updated content by ${role}`;
          const response = await request(app)
            .patch(
              `/groups/${groupId}/text-channels/${adminCreatedChannelId}/messages/${messageId()}/update`
            )
            .set("Content-Type", "application/json")
            .set("Authorization", `Bearer ${accessToken()}`)
            .send({
              newContent: newContent,
            });

          console.log(
            `UPDATE MESSAGE RESPONSE FOR ${role}:`,
            JSON.stringify(response.body, null, 2)
          );

          expect(response.status).toBe(201);
          expect(response.body.success).toBe(true);
          // expect(response.body.data).toMatchObject({
          //   id: messageId(),
          //   channel_id: adminCreatedChannelId,
          //   sender_id: senderId(),
          //   content: newContent,
          //   created_at: expect.any(String),
          //   updated_at: expect.any(String),
          // });
        }
      );
    });

    // DELETE MESSAGE
    describe("DELETE Message - DELETE /groups/:groupId/text-channels/:textChannelId/messages/:messageId/delete", () => {
      test.each([
        {
          role: "Admin",
          accessToken: () => adminAccessToken,
          messageId: () => adminCreatedMessageId,
          testDescription: "should allow an admin to delete their own message",
        },
        {
          role: "Member",
          accessToken: () => memberAccessToken,
          messageId: () => memberCreatedMessageId,
          testDescription: "should allow a member to delete their own message",
        },
        {
          role: "Admin",
          accessToken: () => adminAccessToken,
          messageId: () => memberCreatedMessageId,
          testDescription: "should allow an admin to delete a member's message",
        },
      ])("$testDescription", async ({ accessToken, role, messageId }) => {
        const response = await request(app)
          .patch(
            `/groups/${groupId}/text-channels/${adminCreatedChannelId}/messages/${messageId()}/delete`
          )
          .set("Content-Type", "application/json")
          .set("Authorization", `Bearer ${accessToken()}`);

        console.log(
          `DELETE MESSAGE RESPONSE FOR ${role}:`,
          JSON.stringify(response.body, null, 2)
        );

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          id: messageId(),
          deleted_at: expect.any(String),
        });
      });
    });
  });

  // DELETE TEXT CHANNEL
  describe("DELETE Text Channel - DELETE /groups/:groupId/text-channels/:textChannelId", () => {
    test("should allow an admin to delete a text channel", async () => {
      const response = await request(app)
        .delete(`/groups/${groupId}/text-channels/${adminCreatedChannelId}`)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${adminAccessToken}`);

      console.log(
        `DELETE TEXT CHANNEL RESPONSE FOR ADMIN:`,
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: adminCreatedChannelId,
        group_id: groupId,
        name: expect.any(String),
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });
    });
  });
});
