const request = require("supertest");
const app = require("../../app");
const dotenv = require("dotenv");
const io = require("socket.io-client");
const { createServer } = require("http");
const { initSocketServer } = require("./socketService");
const {
  createGroup,
  loginUser,
  registerUser,
  addMember,
  createTextChannel,
} = require("../helpers/testSetup");
const { broadcastNewMessage } = require("./socketService");

dotenv.config();

const TEST_EMAIL = process.env.TEST_USER_1;

describe("Socket.IO Server Tests", () => {
  let adminAccessToken;
  let adminUserId;
  let groupId;
  let memberId;
  let memberAccessToken;
  let channelId1;
  let channelId2;
  let httpServer;
  let serverPort;
  let adminSocket;
  let memberSocket;
  let adminMessageId;
  let memberMessageId;

  const groupData = {
    name: "Test Group",
    description: "Test description",
  };

  // Initial setup
  beforeAll(async () => {
    httpServer = createServer(app);
    initSocketServer(httpServer);

    await new Promise((resolve) => {
      httpServer.listen(0, () => {
        serverPort = httpServer.address().port;
        console.log(`Test server listening on port ${serverPort}`);
        resolve();
      });
    });

    // Admin login
    const { user, accessToken } = await loginUser(TEST_EMAIL);
    adminUserId = user.id;
    adminAccessToken = accessToken;

    // Create group
    groupId = await createGroup(groupData, adminAccessToken);

    // Register and login member
    const { email: naEmail, userId: naUserId } = await registerUser();
    memberId = naUserId;
    memberAccessToken = (await loginUser(naEmail)).accessToken;

    // Add member to group
    const { success, role } = await addMember(groupId, memberId, adminAccessToken);
    expect(success).toBe(true);
    expect(role.is_admin).toBe(false);

    // Admin creates two text channels
    channelId1 = await createTextChannel(groupId, "channel-1", adminAccessToken);
    channelId2 = await createTextChannel(groupId, "channel-2", adminAccessToken);

    // Create sockets
    adminSocket = io(`http://localhost:${serverPort}`, {
      auth: { token: adminAccessToken },
      autoConnect: false,
    });

    memberSocket = io(`http://localhost:${serverPort}`, {
      auth: { token: memberAccessToken },
      autoConnect: false,
    });
  });

  // Cleanup: Delete the created group and close resources
  afterAll(async () => {
    if (groupId) {
      console.log("CLEANUP: Deleting test group with ID:", groupId);

      await request(app)
        .delete(`/groups/${groupId}`)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${adminAccessToken}`);
    }

    // Disconnect sockets
    if (adminSocket.connected) adminSocket.disconnect();
    if (memberSocket.connected) memberSocket.disconnect();

    if (httpServer) {
      await new Promise((resolve) => httpServer.close(resolve));
    }
  });

  describe("Connection tests", () => {
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

  describe("Join channel tests", () => {
    test.each([
      {
        role: "Admin",
        socket: () => adminSocket,
        channelId: () => channelId1,
      },
      {
        role: "Member",
        socket: () => memberSocket,
        channelId: () => channelId2,
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

  describe("Send message tests", () => {
    test.each([
      {
        role: "Admin",
        socket: () => adminSocket,
        channelId: () => channelId1,
        userId: () => adminUserId,
        message: "Admin message in channel 1",
        accessToken: () => adminAccessToken,
      },
      {
        role: "Member",
        socket: () => memberSocket,
        channelId: () => channelId2,
        userId: () => memberId,
        message: "Member message in channel 2",
        accessToken: () => memberAccessToken,
      },
    ])("$role sends message", ({ role, socket, channelId, userId, message, accessToken }, done) => {
      const currentSocket = socket();

      broadcastNewMessage({
        groupId: groupId,
        textChannelId: channelId(),
        payload: {
          id: "test-message-id",
          authorId: userId(),
          textChannelId: channelId(),
          content: message,
          createdAt: new Date().toISOString(),
        },
      });

      currentSocket.on("new_message", (data) => {
        console.log(`${role} received new message:`, data);
        done();
      });
    });
  });

  // describe("Update message tests", () => {
  //   test.each([
  //     {
  //       role: "Admin",
  //       socket: () => adminSocket,
  //       channelId: () => channelId1,
  //       userId: () => adminUserId,
  //       message: "Updated Admin message in channel 1",
  //       messageId: () => adminMessageId,
  //     },
  //     {
  //       role: "Member",
  //       socket: () => memberSocket,
  //       channelId: () => channelId2,
  //       userId: () => memberId,
  //       message: "Updated Member message in channel 2",
  //       messageId: () => memberMessageId,
  //     },
  //   ])("$role updates message", ({ role, socket, channelId, userId, message, messageId }, done) => {
  //     const currentSocket = socket();

  //     currentSocket.emit("update_message", {
  //       channelId: channelId(),
  //       groupId: groupId,
  //       messageId: messageId(),
  //       newContent: message,
  //     });

  //     currentSocket.on("message_updated", (data) => {
  //       console.log(`${role} updated message:`, data);

  //       expect(data.channelId).toBe(channelId());
  //       expect(data.message.id).toBe(messageId());
  //       expect(data.message.content).toBe(message);
  //       expect(data.message.userId).toBe(userId());
  //       expect(data.message.timestamp).toBeDefined();

  //       done();
  //     });
  //   });
  // });

  // describe("Delete message tests", () => {
  //   test.each([
  //     {
  //       role: "Admin",
  //       socket: () => adminSocket,
  //       channelId: () => channelId1,
  //       messageId: () => adminMessageId,
  //     },
  //     {
  //       role: "Member",
  //       socket: () => memberSocket,
  //       channelId: () => channelId2,
  //       messageId: () => memberMessageId,
  //     },
  //   ])("$role deletes message", ({ role, socket, channelId, messageId }, done) => {
  //     const currentSocket = socket();

  //     currentSocket.emit("delete_message", {
  //       channelId: channelId(),
  //       messageId: messageId(),
  //     });

  //     currentSocket.on("message_deleted", (data) => {
  //       console.log(`${role} deleted message:`, data);

  //       expect(data.channelId).toBe(channelId());
  //       expect(data.message.id).toBe(messageId());
  //       expect(data.message.deletedAt).toBeDefined();

  //       done();
  //     });
  //   });
  // });

  describe("Leave channel tests", () => {
    test.each([
      {
        role: "Admin",
        socket: () => adminSocket,
        channelId: () => channelId1,
      },
      {
        role: "Member",
        socket: () => memberSocket,
        channelId: () => channelId2,
      },
    ])("$role leaves channel", ({ role, socket, channelId }, done) => {
      const currentSocket = socket();

      console.log(`${role} sending leave channel request:`, {
        channelId: channelId(),
        groupId: groupId,
      });

      currentSocket.emit("leave_channel", "text_channel", {
        textChannelId: channelId(),
        groupId: groupId,
      });

      currentSocket.on("left_channel", (data) => {
        console.log(`${role} left channel:`, data);

        expect(data.ids.textChannelId).toBe(channelId());
        expect(data.ids.groupId).toBe(groupId);

        done();
      });
    });
  });
});
