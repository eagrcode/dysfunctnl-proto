const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const {
  createMessage,
  updateMessage,
  deleteMessage,
} = require("../../_features/text-channels/text-channel-messages/textChannelMessages.model");

let ioInstance = null;

const getRoom = (type, ids) => {
  if (type === "text_channel") {
    return `group_${ids.groupId}_channel_${ids.textChannelId}`;
  }
  if (type === "image") {
    return `group_${ids.groupId}_image_${ids.imageId}`;
  }
  throw new Error("Invalid room type");
};

const emitToRoom = (roomName, type, payload) => {
  console.log("ioInstance:", ioInstance);
  console.log(`Emitting to room:`, { roomName, type, payload });
  if (!ioInstance) {
    throw new Error("SocketService instance not initialised");
  }

  ioInstance.to(roomName).emit(type, payload);
};

const broadcastNewMessage = ({ groupId, textChannelId, payload }) => {
  const roomName = `group_${groupId}_channel_${textChannelId}`;
  console.log("Broadcasting new message:", { roomName, payload });
  emitToRoom(roomName, "new_message", payload);
};

const broadcastMessageUpdated = ({ groupId, textChannelId, payload }) => {
  const roomName = getRoom("text_channel", { groupId, textChannelId });
  console.log("Broadcasting message updated:", { roomName, payload });
  emitToRoom(roomName, "message_updated", payload);
};

const broadcastMessageDeleted = ({ groupId, textChannelId, payload }) => {
  const roomName = getRoom("text_channel", { groupId, textChannelId });
  console.log("Broadcasting message deleted:", { roomName, payload });
  emitToRoom(roomName, "message_deleted", payload);
};

// const asyncHandler = (fn) => {
//   return async (...args) => {
//     try {
//       await fn(...args);
//     } catch (error) {
//       console.error("Socket error:", error);
//     }
//   };
// };

const initSocketServer = (httpServer) => {
  if (ioInstance) {
    console.log("Socket.IO already initialised, returning existing instance");
    return ioInstance;
  }

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
    console.log(`Client connected: ${socket.id}, User ID: ${socket.user.id}`);

    // Join channel
    socket.on("join_channel", (type, ids) => {
      const roomName = getRoom(type, ids);
      console.log(`User ${socket.user.id} attempting to join channel:`, roomName);
      socket.join(roomName);
      socket.emit("joined_channel", { type, ids, roomName });
      console.log(`User ${socket.user.id} joined room: ${roomName}`);
    });

    // Leave channel
    socket.on("leave_channel", (type, ids) => {
      const roomName = getRoom(type, ids);
      console.log(`User ${socket.user.id} attempting to leave channel:`, roomName);
      socket.leave(roomName);
      socket.emit("left_channel", { type, ids, roomName });
      console.log(`User ${socket.user.id} left room: ${roomName}`);
    });

    // Send message
    // socket.on(
    //   "send_message",
    //   asyncHandler(async (data) => {
    //     const { groupId, channelId, message } = data;
    //     const userId = socket.user.id;

    //     try {
    //       const result = await createMessage(channelId, message, userId);
    //       const messageId = result.id;
    //       const createdAt = result.created_at;

    //       // Broadcast to room
    //       io.to(roomName).emit("new_message", {
    //         channelId,
    //         groupId,
    //         roomName,
    //         message: {
    //           id: messageId,
    //           userId,
    //           content: message,
    //           timestamp: createdAt,
    //         },
    //       });
    //     } catch (error) {
    //       console.error("Error saving message:", error);
    //       socket.emit("error", { message: "Failed to save message" });
    //     }
    //   })
    // );

    // Update message
    // socket.on(
    //   "update_message",
    //   asyncHandler(async (data) => {
    //     const { groupId, channelId, messageId, newContent } = data;
    //     const userId = socket.user.id;

    //     try {
    //       const result = await updateMessage(channelId, messageId, newContent, userId);
    //       const updatedAt = result.updated_at;
    //       const updatedMessage = result.content;

    //       // Broadcast to room
    //       io.to(roomName).emit("message_updated", {
    //         channelId,
    //         groupId,
    //         roomName,
    //         message: {
    //           id: messageId,
    //           userId,
    //           content: updatedMessage,
    //           timestamp: updatedAt,
    //         },
    //       });
    //     } catch (error) {
    //       console.error("Error updating message:", error);
    //       socket.emit("error", { message: "Failed to update message" });
    //     }
    //   })
    // );

    // Delete message
    // socket.on(
    //   "delete_message",
    //   asyncHandler(async (data) => {
    //     const { channelId, messageId } = data;
    //     const userId = socket.user.id;

    //     const result = await deleteMessage(channelId, messageId, userId);
    //     const deletedAt = result.deleted_at;

    //     // Broadcast to room
    //     io.to(roomName).emit("message_deleted", {
    //       channelId,
    //       roomName,
    //       message: {
    //         userId,
    //         id: messageId,
    //         deletedAt,
    //       },
    //     });
    //   })
    // );

    // Disconnection handler
    socket.on("disconnect", (reason) => {
      console.log(`Client disconnected: ${socket.id} (${reason})`);
    });

    // Error handler
    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });
  });

  ioInstance = io;
  console.log("Socket.io server initialised");
  return io;
};

module.exports = {
  initSocketServer,
  broadcastNewMessage,
  broadcastMessageUpdated,
  broadcastMessageDeleted,
};
