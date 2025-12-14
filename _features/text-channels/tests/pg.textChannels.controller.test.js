const request = require("supertest");
const app = require("../../../app");
const dotenv = require("dotenv");
const io = require("socket.io-client");
const { createServer } = require("http");
const { initSocketServer } = require("../../../_shared/utils/socketService");
const {
  createGroup,
  loginUser,
  registerUser,
  addMember,
} = require("../../../_shared/helpers/testSetup");

dotenv.config();

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
  let httpServer;
  let serverPort;
  let adminSocket;
  let memberSocket;

  const groupData = {
    name: "Test Group",
    description: "Test description",
  };

  // Initial setup
  beforeAll(async () => {
    // Register admin user and login
    const { userId, email } = await registerUser();
    adminUserId = userId;
    const { user, accessToken } = await loginUser(email);
    adminAccessToken = accessToken;

    // Create group as admin
    groupId = await createGroup(groupData, adminAccessToken);

    // Register member user and login
    const { email: naEmail, userId: naUserId } = await registerUser();
    memberId = naUserId;
    memberAccessToken = (await loginUser(naEmail)).accessToken;

    // Add member to group
    const { success, role } = await addMember(groupId, memberId, adminAccessToken);
    expect(success).toBe(true);
    expect(role.is_admin).toBe(false);

    // Setup HTTP and Socket servers
    httpServer = createServer(app);
    initSocketServer(httpServer);

    await new Promise((resolve) => {
      console.log("Starting test server...");
      httpServer.listen(0, () => {
        serverPort = httpServer.address().port;
        console.log(`Test server listening on port ${serverPort}`);
        resolve();
      });
    });

    adminSocket = io(`http://localhost:${serverPort}`, {
      auth: { token: adminAccessToken },
      autoConnect: false,
    });

    memberSocket = io(`http://localhost:${serverPort}`, {
      auth: { token: memberAccessToken },
      autoConnect: false,
    });
  });

  // Cleanup
  afterAll(async () => {
    if (groupId) {
      console.log("CLEANUP: Deleting test group with ID:", groupId);
      await request(app)
        .delete(`/groups/${groupId}`)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${adminAccessToken}`);
    }

    // Close sockets and server
    if (httpServer.listening) {
      console.log("Disconnecting user sockets and closing test server...");
      await new Promise((resolve) => {
        if (adminSocket.connected) adminSocket.disconnect();
        if (memberSocket.connected) memberSocket.disconnect();
        httpServer.close(resolve);
        console.log("Test server closed");
      });
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
      ])("should allow a $role to get all text channels", async ({ accessToken, role }) => {
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
      });
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
      ])("should allow a $role to get a text channel by ID", async ({ accessToken, role }) => {
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
      });
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

        expect(response.status).toBe(200);
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

  describe("SocketServer Connection tests", () => {
    test.each([
      {
        role: "Admin",
        socket: () => adminSocket,
      },
      {
        role: "Member",
        socket: () => memberSocket,
      },
    ])("Connect as $role", ({ role, socket }, done) => {
      const currentSocket = socket();

      currentSocket.connect();

      currentSocket.on("connect", () => {
        console.log(`${role} connected to server with socket ID:`, currentSocket.id);
        expect(currentSocket.connected).toBe(true);
        done();
      });
    });
  });

  describe("Join SocketServer Channel", () => {
    test.each([
      {
        role: "Admin",
        socket: () => adminSocket,
        channelId: () => adminCreatedChannelId,
      },
      {
        role: "Member",
        socket: () => memberSocket,
        channelId: () => adminCreatedChannelId,
      },
    ])("$role joins channel", ({ role, socket, channelId }, done) => {
      const currentSocket = socket();

      console.log(`${role} attempting to join channel:`, {
        type: "text_channel",
        ids: {
          textChannelId: channelId(),
          groupId: groupId,
        },
      });

      currentSocket.emit("join_channel", "text_channel", {
        textChannelId: channelId(),
        groupId: groupId,
      });

      currentSocket.on("joined_channel", (data) => {
        console.log(`${role} joined channel:`, data);

        expect(data.type).toBe("text_channel");
        expect(data.ids.textChannelId).toBe(channelId());
        expect(data.ids.groupId).toBe(groupId);
        expect(data.roomName).toBeDefined();

        done();
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
          socket: () => adminSocket,
        },
        {
          role: "Member",
          accessToken: () => memberAccessToken,
          socket: () => memberSocket,
        },
      ])(
        "should allow a $role to send a message in a text channel",
        async ({ accessToken, role, socket }) => {
          let socketEventFired = false;
          const messageContent = `Hello from ${role}`;

          socket().once("new_message", (data) => {
            console.log(`Received new_message event for ${role}`);
            socketEventFired = true;
            console.log(`Socket event fired = ${socketEventFired}`);
            console.log(`${role} - Socket event received with data:`, data);
            expect(data).toMatchObject({
              id: expect.any(String),
              textChannelId: adminCreatedChannelId,
              authorId: expect.any(String),
              content: messageContent,
              createdAt: expect.any(String),
            });
          });

          const response = await request(app)
            .post(`/groups/${groupId}/text-channels/${adminCreatedChannelId}/messages`)
            .set("Content-Type", "application/json")
            .set("Authorization", `Bearer ${accessToken()}`)
            .send({
              content: messageContent,
            });

          console.log(`SEND MESSAGE RESPONSE FOR ${role}:`, JSON.stringify(response.body, null, 2));

          role === "Admin"
            ? (adminCreatedMessageId = response.body.data.id)
            : (memberCreatedMessageId = response.body.data.id);

          expect(response.status).toBe(201);
          expect(response.body.success).toBe(true);
          expect(response.body.data).toMatchObject({
            id: expect.any(String),
            createdAt: expect.any(String),
          });

          expect(socketEventFired).toBe(true);
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
            .get(`/groups/${groupId}/text-channels/${adminCreatedChannelId}/messages`)
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
          socket: () => adminSocket,
        },
        {
          role: "Member",
          accessToken: () => memberAccessToken,
          messageId: () => memberCreatedMessageId,
          testDescription: "should allow a member to update their own message",
          senderId: () => memberId,
          socket: () => memberSocket,
        },
        {
          role: "Admin",
          accessToken: () => adminAccessToken,
          messageId: () => memberCreatedMessageId,
          testDescription: "should allow an admin to update a member's message",
          senderId: () => memberId,
          socket: () => adminSocket,
        },
      ])("$testDescription", async ({ accessToken, role, messageId, senderId, socket }) => {
        let socketEventFired = false;
        const newContent = `Updated content by ${role}`;

        socket().once("message_updated", (data) => {
          console.log(`Received message_updated event for ${role}`);
          socketEventFired = true;
          console.log(`Socket event fired = ${socketEventFired}`);
          console.log(`${role} - Socket event received with data:`, data);
          expect(data).toMatchObject({
            id: messageId(),
            textChannelId: adminCreatedChannelId,
            authorId: role === "Admin" && senderId() === adminUserId ? adminUserId : memberId,
            content: newContent,
            updatedAt: expect.any(String),
          });
        });

        const response = await request(app)
          .patch(
            `/groups/${groupId}/text-channels/${adminCreatedChannelId}/messages/${messageId()}/update`
          )
          .set("Content-Type", "application/json")
          .set("Authorization", `Bearer ${accessToken()}`)
          .send({
            newContent: newContent,
          });

        console.log(`UPDATE MESSAGE RESPONSE FOR ${role}:`, JSON.stringify(response.body, null, 2));

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          id: messageId(),
          textChannelId: adminCreatedChannelId,
          authorId: role === "Admin" && senderId() === adminUserId ? adminUserId : memberId,
          content: newContent,
          updatedAt: expect.any(String),
        });

        expect(socketEventFired).toBe(true);
      });
    });

    // DELETE MESSAGE
    describe("DELETE Message - DELETE /groups/:groupId/text-channels/:textChannelId/messages/:messageId/delete", () => {
      test.each([
        {
          role: "Admin",
          accessToken: () => adminAccessToken,
          messageId: () => adminCreatedMessageId,
          authorId: () => adminUserId,
          testDescription: "should allow an admin to delete their own message",
          socket: () => adminSocket,
        },
        {
          role: "Member",
          accessToken: () => memberAccessToken,
          messageId: () => memberCreatedMessageId,
          authorId: () => memberId,
          testDescription: "should allow a member to delete their own message",
          socket: () => memberSocket,
        },
        {
          role: "Admin",
          accessToken: () => adminAccessToken,
          messageId: () => memberCreatedMessageId,
          authorId: () => memberId,
          testDescription: "should allow an admin to delete a member's message",
          socket: () => adminSocket,
        },
      ])("$testDescription", async ({ accessToken, role, messageId, socket, authorId }) => {
        let socketEventFired = false;

        socket().once("message_deleted", (data) => {
          console.log(`Received message_deleted event for ${role}`);
          socketEventFired = true;
          console.log(`Socket event fired = ${socketEventFired}`);
          console.log(`${role} - Socket event received with data:`, data);
          expect(data).toMatchObject({
            id: messageId(),
            authorId: role === "Admin" && authorId() === adminUserId ? adminUserId : memberId,
            textChannelId: adminCreatedChannelId,
            deletedAt: expect.any(String),
          });
        });

        const response = await request(app)
          .patch(
            `/groups/${groupId}/text-channels/${adminCreatedChannelId}/messages/${messageId()}/delete`
          )
          .set("Content-Type", "application/json")
          .set("Authorization", `Bearer ${accessToken()}`);

        console.log(`DELETE MESSAGE RESPONSE FOR ${role}:`, JSON.stringify(response.body, null, 2));

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          id: messageId(),
          authorId: role === "Admin" && authorId() === adminUserId ? adminUserId : memberId,
          textChannelId: adminCreatedChannelId,
          deletedAt: expect.any(String),
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
