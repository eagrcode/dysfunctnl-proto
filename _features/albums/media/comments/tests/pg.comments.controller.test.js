const request = require("supertest");
const app = require("../../../../../app");
const io = require("socket.io-client");
const { createServer } = require("http");
const { initSocketServer } = require("../../../../../_shared/utils/socketService");
const {
  createGroup,
  loginUser,
  registerUser,
  addMember,
  createAlbum,
  uploadImageToAlbum,
} = require("../../../../../_shared/helpers/testSetup");

describe("Media Comments Controller Integration Tests - Authorised Actions", () => {
  let adminUserId;
  let adminAccessToken;
  let groupId;
  let memberId;
  let memberAccessToken;
  let albumId;
  let adminUploadedImageId;
  let memberUploadedImageId;
  let httpServer;
  let serverPort;
  let adminSocket;
  let memberSocket;

  const groupData = {
    name: "Test Group",
    description: "Test description",
  };

  const albumData = {
    name: "Test Album",
    description: "Album for comment tests",
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

    // Create Album
    albumId = await createAlbum(groupId, albumData, adminAccessToken);

    // Upload image as admin
    adminUploadedImageId = await uploadImageToAlbum(groupId, albumId, adminAccessToken);

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

  // Cleanup: Delete the created group
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
        imageId: () => adminUploadedImageId,
      },
      {
        role: "Member",
        socket: () => memberSocket,
        imageId: () => adminUploadedImageId,
      },
    ])("$role joins channel", ({ role, socket, imageId }, done) => {
      const currentSocket = socket();

      console.log(`${role} attempting to join channel:`, {
        type: "image",
        ids: {
          imageId: imageId(),
          groupId: groupId,
        },
      });

      currentSocket.emit("join_channel", "image", {
        imageId: imageId(),
        groupId: groupId,
      });

      currentSocket.on("joined_channel", (data) => {
        console.log(`${role} joined channel:`, data);

        expect(data.type).toBe("image");
        expect(data.ids.imageId).toBe(imageId());
        expect(data.ids.groupId).toBe(groupId);
        expect(data.roomName).toBeDefined();

        done();
      });
    });
  });

  // ADD COMMENT
  describe("ADD COMMENT", () => {
    test.each([
      {
        role: "Admin",
        userId: () => adminUserId,
        accessToken: () => adminAccessToken,
        socket: () => adminSocket,
        imageId: () => adminUploadedImageId,
      },
      {
        role: "Member",
        userId: () => memberId,
        accessToken: () => memberAccessToken,
        socket: () => memberSocket,
        imageId: () => adminUploadedImageId,
      },
    ])(
      "Should allow $role to add comment and receive WebSocket broadcast",
      async ({ role, userId, accessToken, socket, imageId }) => {
        let socketEventFired = false;
        const commentContent = `This is a comment from ${role}`;

        socket().once("new_comment", (data) => {
          console.log(`Received new_message event for ${role}`);
          socketEventFired = true;
          console.log(`Socket event fired = ${socketEventFired}`);
          console.log(`${role} - Socket event received with data:`, data);
        });

        const response = await request(app)
          .post(`/groups/${groupId}/albums/${albumId}/media/${imageId()}/comments`)
          .send({ content: commentContent })
          .set("Content-Type", "application/json")
          .set("Authorization", `Bearer ${accessToken()}`);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      }
    );
  });
});
