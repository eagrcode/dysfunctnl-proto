const request = require("supertest");
const app = require("../../app");
const dotenv = require("dotenv");
const io = require("socket.io-client");
const { createServer } = require("http");
const initSocketServer = require("./initSocketServer");

const {
  createGroup,
  loginUser,
  registerUser,
  addMember,
  createTextChannel,
} = require("../helpers/testSetup");

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
    adminSocket = io("http://localhost:3000", {
      auth: { token: adminAccessToken },
      autoConnect: false,
    });

    memberSocket = io("http://localhost:3000", {
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

    if (httpServer) {
      await new Promise((resolve) => httpServer.close(resolve));
    }

    // Disconnect sockets
    if (adminSocket) adminSocket.disconnect();
    if (memberSocket) memberSocket.disconnect();
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
        channelId: channelId(),
        groupId: groupId,
      });

      currentSocket.emit("join_channel", channelId(), groupId);

      currentSocket.on("joined_channel", (data) => {
        console.log(`${role} joined channel:`, data);

        expect(data.channelId).toBe(channelId());
        expect(data.groupId).toBe(groupId);
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
      },
      {
        role: "Member",
        socket: () => memberSocket,
        channelId: () => channelId2,
        userId: () => memberId,
        message: "Member message in channel 2",
      },
    ])("$role sends message", ({ role, socket, channelId, userId, message }, done) => {
      const currentSocket = socket();

      currentSocket.emit("send_message", {
        channelId: channelId(),
        groupId: groupId,
        message,
      });

      currentSocket.on("new_message", (data) => {
        console.log(`${role} received message:`, data);

        role === "Admin" ? (adminMessageId = data.message.id) : (memberMessageId = data.message.id);

        expect(data.channelId).toBe(channelId());
        expect(data.message.id).toBeDefined();
        expect(data.message.content).toBe(message);
        expect(data.message.userId).toBe(userId());
        expect(data.message.timestamp).toBeDefined();

        done();
      });
    });
  });

  describe("Update message tests", () => {
    test.each([
      {
        role: "Admin",
        socket: () => adminSocket,
        channelId: () => channelId1,
        userId: () => adminUserId,
        message: "Updated Admin message in channel 1",
        messageId: () => adminMessageId,
      },
      {
        role: "Member",
        socket: () => memberSocket,
        channelId: () => channelId2,
        userId: () => memberId,
        message: "Updated Member message in channel 2",
        messageId: () => memberMessageId,
      },
    ])("$role updates message", ({ role, socket, channelId, userId, message, messageId }, done) => {
      const currentSocket = socket();

      currentSocket.emit("update_message", {
        channelId: channelId(),
        groupId: groupId,
        messageId: messageId(),
        newContent: message,
      });

      currentSocket.on("message_updated", (data) => {
        console.log(`${role} updated message:`, data);

        expect(data.channelId).toBe(channelId());
        expect(data.message.id).toBe(messageId());
        expect(data.message.content).toBe(message);
        expect(data.message.userId).toBe(userId());
        expect(data.message.timestamp).toBeDefined();

        done();
      });
    });
  });

  // Delete message
  describe("Delete message tests", () => {
    test.each([
      {
        role: "Admin",
        socket: () => adminSocket,
        channelId: () => channelId1,
        messageId: () => adminMessageId,
      },
      {
        role: "Member",
        socket: () => memberSocket,
        channelId: () => channelId2,
        messageId: () => memberMessageId,
      },
    ])("$role deletes message", ({ role, socket, channelId, messageId }, done) => {
      const currentSocket = socket();

      currentSocket.emit("delete_message", {
        channelId: channelId(),
        messageId: messageId(),
      });

      currentSocket.on("message_deleted", (data) => {
        console.log(`${role} deleted message:`, data);

        expect(data.channelId).toBe(channelId());
        expect(data.message.id).toBe(messageId());
        expect(data.message.deletedAt).toBeDefined();

        done();
      });
    });
  });

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

      currentSocket.emit("leave_channel", { channelId: channelId(), groupId: groupId });

      currentSocket.on("left_channel", (data) => {
        console.log(`${role} left channel:`, data);

        expect(data.channelId).toBe(channelId());
        expect(data.groupId).toBe(groupId);

        done();
      });
    });
  });
});
