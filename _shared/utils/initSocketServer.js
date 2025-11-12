const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const {
  createMessage,
  updateMessage,
  deleteMessage,
} = require("../../_features/text-channels/text-channel-messages/textChannelMessages.model");

const asyncHandler = (fn) => {
  return async (...args) => {
    try {
      await fn(...args);
    } catch (error) {
      console.error("Socket error:", error);
    }
  };
};

const initSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      credentials: true,
    },
  });

  // Middleware for JWT authentication
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication error"));

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) return next(new Error("Invalid token"));
      socket.user = user;
      console.log(`Socket authenticated: User ID ${user.id}`);
      next();
    });
  });

  // Connection handler
  io.on("connection", (socket) => {
    let roomName;
    console.log(`Client connected: ${socket.id}, User ID: ${socket.user.id}`);

    // Join channel
    socket.on("join_channel", (channelId, groupId) => {
      roomName = `group_${groupId}_channel_${channelId}`;
      socket.join(roomName);
      console.log(`User ${socket.user.id} joined room: ${roomName}`);

      socket.emit("joined_channel", { channelId, groupId, roomName });
    });

    // Leave channel
    socket.on("leave_channel", (data) => {
      const { channelId, groupId } = data;

      socket.leave(roomName);
      console.log(`User ${socket.user.id} left room: ${roomName}`);

      socket.emit("left_channel", { channelId, groupId, roomName });
    });

    // Send message
    socket.on(
      "send_message",
      asyncHandler(async (data) => {
        const { groupId, channelId, message } = data;
        const userId = socket.user.id;

        try {
          const result = await createMessage(channelId, message, userId);
          const messageId = result.id;
          const createdAt = result.created_at;

          // Broadcast to room
          io.to(roomName).emit("new_message", {
            channelId,
            groupId,
            roomName,
            message: {
              id: messageId,
              userId,
              content: message,
              timestamp: createdAt,
            },
          });
        } catch (error) {
          console.error("Error saving message:", error);
          socket.emit("error", { message: "Failed to save message" });
        }
      })
    );

    // Update message
    socket.on(
      "update_message",
      asyncHandler(async (data) => {
        const { groupId, channelId, messageId, newContent } = data;
        const userId = socket.user.id;

        try {
          const result = await updateMessage(channelId, messageId, newContent, userId);
          const updatedAt = result.updated_at;
          const updatedMessage = result.content;

          // Broadcast to room
          io.to(roomName).emit("message_updated", {
            channelId,
            groupId,
            roomName,
            message: {
              id: messageId,
              userId,
              content: updatedMessage,
              timestamp: updatedAt,
            },
          });
        } catch (error) {
          console.error("Error updating message:", error);
          socket.emit("error", { message: "Failed to update message" });
        }
      })
    );

    // Delete message
    socket.on(
      "delete_message",
      asyncHandler(async (data) => {
        const { channelId, messageId } = data;
        const userId = socket.user.id;

        const result = await deleteMessage(channelId, messageId, userId);
        const deletedAt = result.deleted_at;

        // Broadcast to room
        io.to(roomName).emit("message_deleted", {
          channelId,
          roomName,
          message: {
            userId,
            id: messageId,
            deletedAt,
          },
        });
      })
    );

    // Disconnection handler
    socket.on("disconnect", (reason) => {
      console.log(`🔌 Client disconnected: ${socket.id} (${reason})`);
    });

    // Error handler
    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });
  });

  console.log("Socket.io server initialized");
  return io;
};

module.exports = initSocketServer;
