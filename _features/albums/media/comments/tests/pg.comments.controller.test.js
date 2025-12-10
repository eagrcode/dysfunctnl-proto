const request = require("supertest");
const app = require("../../../../../app");
const io = require("socket.io-client");
const { createServer } = require("http");
const { initSocketServer } = require("../../../../../_shared/utils/socketService");
const customConsoleLog = require("../../../../../_shared/utils/customConsoleLog");
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
  let adminCommentId;
  let memberCommentId;
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
      customConsoleLog("Starting test server...");
      httpServer.listen(0, () => {
        serverPort = httpServer.address().port;
        customConsoleLog(`Test server listening on port ${serverPort}`);
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
      customConsoleLog("CLEANUP: Deleting test group with ID:", { groupId });

      await request(app)
        .delete(`/groups/${groupId}`)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${adminAccessToken}`);
    }

    // Close sockets and server
    if (httpServer.listening) {
      customConsoleLog("Disconnecting user sockets and closing test server...");
      await new Promise((resolve) => {
        if (adminSocket.connected) adminSocket.disconnect();
        if (memberSocket.connected) memberSocket.disconnect();
        httpServer.close(resolve);
        customConsoleLog("Test server closed");
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
        customConsoleLog(`${role} connected to server:`, { socketId: currentSocket.id });
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

      customConsoleLog(`${role} attempting to join channel:`, {
        type: "image",
        ids: {
          mediaId: imageId(),
          groupId: groupId,
        },
      });

      currentSocket.emit("join_channel", "image", {
        groupId: groupId,
        mediaId: imageId(),
      });

      currentSocket.on("joined_channel", (data) => {
        customConsoleLog(`${role} joined channel:`, data);

        expect(data.type).toBe("image");
        expect(data.ids.mediaId).toBe(imageId());
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
        const responseAssertion = {
          id: expect.any(String),
          mediaId: imageId(),
          senderId: userId(),
          content: commentContent,
          createdAt: expect.any(String),
        };

        socket().once("new_comment", (data) => {
          customConsoleLog(` ${role} - Received new_comment event`);
          socketEventFired = true;
          customConsoleLog(` ${role} - Socket event fired = ${socketEventFired}`);
          customConsoleLog(`${role} - Socket event received with data:`, data);
          expect(data).toMatchObject(responseAssertion);
        });

        const response = await request(app)
          .post(`/groups/${groupId}/albums/${albumId}/media/${imageId()}/comments`)
          .send({ content: commentContent })
          .set("Content-Type", "application/json")
          .set("Authorization", `Bearer ${accessToken()}`);

        customConsoleLog(
          `ADD COMMENT RESPONSE FOR ${role}:`,
          JSON.stringify(response.body, null, 2)
        );

        role === "Admin"
          ? (adminCommentId = response.body.data.id)
          : (memberCommentId = response.body.data.id);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject(responseAssertion);
      }
    );
  });

  // UPDATE COMMENT
  describe("UPDATE COMMENT", () => {
    test.each([
      {
        role: "Admin",
        userId: () => adminUserId,
        accessToken: () => adminAccessToken,
        socket: () => adminSocket,
        imageId: () => adminUploadedImageId,
        commentId: () => adminCommentId,
      },
      {
        role: "Member",
        userId: () => memberId,
        accessToken: () => memberAccessToken,
        socket: () => memberSocket,
        imageId: () => adminUploadedImageId,
        commentId: () => memberCommentId,
      },
    ])(
      "Should allow $role to update comment and receive WebSocket broadcast",
      async ({ role, userId, accessToken, socket, imageId, commentId }) => {
        let socketEventFired = false;
        const updatedCommentContent = `This is an updated comment from ${role}`;
        const responseAssertion = {
          id: commentId(),
          mediaId: imageId(),
          senderId: userId(),
          updatedContent: updatedCommentContent,
          updatedAt: expect.any(String),
        };

        socket().once("comment_updated", (data) => {
          customConsoleLog(` ${role} - Received comment_updated event`);
          socketEventFired = true;
          customConsoleLog(` ${role} - Socket event fired = ${socketEventFired}`);
          customConsoleLog(`${role} - Socket event received with data:`, data);
          expect(data).toMatchObject(responseAssertion);
        });

        const response = await request(app)
          .patch(`/groups/${groupId}/albums/${albumId}/media/${imageId()}/comments/${commentId()}`)
          .send({ updatedContent: updatedCommentContent })
          .set("Content-Type", "application/json")
          .set("Authorization", `Bearer ${accessToken()}`);

        customConsoleLog(
          `UPDATE COMMENT RESPONSE FOR ${role}:`,
          JSON.stringify(response.body, null, 2)
        );

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject(responseAssertion);
      }
    );
  });

  // DELETE COMMENT
  describe("DELETE COMMENT", () => {
    test.each([
      {
        role: "Admin",
        userId: () => adminUserId,
        accessToken: () => adminAccessToken,
        socket: () => adminSocket,
        imageId: () => adminUploadedImageId,
        commentId: () => adminCommentId,
      },
      {
        role: "Member",
        userId: () => memberId,
        accessToken: () => memberAccessToken,
        socket: () => memberSocket,
        imageId: () => adminUploadedImageId,
        commentId: () => memberCommentId,
      },
    ])(
      "Should allow $role to delete comment and receive WebSocket broadcast",
      async ({ role, userId, accessToken, socket, imageId, commentId }) => {
        let socketEventFired = false;
        const responseAssertion = {
          id: commentId(),
          mediaId: imageId(),
        };

        socket().once("comment_deleted", (data) => {
          customConsoleLog(` ${role} - Received comment_deleted event`);
          socketEventFired = true;
          customConsoleLog(` ${role} - Socket event fired = ${socketEventFired}`);
          customConsoleLog(`${role} - Socket event received with data:`, data);
          expect(data).toMatchObject(responseAssertion);
        });

        const response = await request(app)
          .delete(`/groups/${groupId}/albums/${albumId}/media/${imageId()}/comments/${commentId()}`)
          .set("Content-Type", "application/json")
          .set("Authorization", `Bearer ${accessToken()}`);

        customConsoleLog(
          `DELETE COMMENT RESPONSE FOR ${role}:`,
          JSON.stringify(response.body, null, 2)
        );

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject(responseAssertion);
      }
    );
  });
});
