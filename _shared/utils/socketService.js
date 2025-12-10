const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const customConsoleLog = require("./customConsoleLog");

let io = null;

const initSocketServer = (httpServer) => {
  if (io) {
    customConsoleLog("Socket.IO already initialised");
    return io;
  }

  io = new Server(httpServer, {
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
      customConsoleLog("Socket authenticated:", {
        userId: user.id,
      });
      next();
    });
  });

  // Connection handler
  io.on("connection", (socket) => {
    customConsoleLog("Client connected:", {
      socketId: socket.id,
      userId: socket.user.id,
    });

    // Join channel
    socket.on("join_channel", (type, ids) => {
      const roomName = getRoom(type, ids);
      socket.join(roomName);
      customConsoleLog("User joined room:", {
        userId: socket.user.id,
        roomName,
      });
      socket.emit("joined_channel", { type, ids, roomName });
    });

    // Leave channel
    socket.on("leave_channel", (type, ids) => {
      const roomName = getRoom(type, ids);
      socket.leave(roomName);
      customConsoleLog("User left room:", {
        userId: socket.user.id,
        roomName,
      });
      socket.emit("left_channel", { type, ids, roomName });
    });

    // Disconnection handler
    socket.on("disconnect", (reason) => {
      customConsoleLog("Client disconnected:", {
        socketId: socket.id,
        userId: socket.user.id,
        reason,
      });
    });

    // Error handler
    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });
  });

  customConsoleLog("Socket.io server initialised");
  return io;
};

const getRoom = (type, ids) => {
  customConsoleLog("Structuring room name from details:", { type, ids });
  if (type === "text_channel") {
    return `group_${ids.groupId}_channel_${ids.textChannelId}`;
  }
  if (type === "image") {
    return `group_${ids.groupId}_image_${ids.mediaId}`;
  }
  throw new Error("Invalid room type");
};

const broadcast = (eventType, channelType, ids, payload) => {
  if (!io) {
    throw new Error("SocketService not initialised");
  }
  const roomName = getRoom(channelType, ids);
  customConsoleLog(`Broadcasting...`, {
    eventType,
    roomName,
    payload,
  });
  io.to(roomName).emit(eventType, payload);
};

const broadcastNewMessage = ({ groupId, textChannelId, payload }) =>
  broadcast("new_message", "text_channel", { groupId, textChannelId }, payload);

const broadcastMessageUpdated = ({ groupId, textChannelId, payload }) =>
  broadcast("message_updated", "text_channel", { groupId, textChannelId }, payload);

const broadcastMessageDeleted = ({ groupId, textChannelId, payload }) =>
  broadcast("message_deleted", "text_channel", { groupId, textChannelId }, payload);

const broadcastNewComment = ({ groupId, mediaId, payload }) =>
  broadcast("new_comment", "image", { groupId, mediaId }, payload);

const broadcastCommentUpdated = ({ groupId, mediaId, payload }) =>
  broadcast("comment_updated", "image", { groupId, mediaId }, payload);

const broadcastCommentDeleted = ({ groupId, mediaId, payload }) =>
  broadcast("comment_deleted", "image", { groupId, mediaId }, payload);

module.exports = {
  initSocketServer,
  broadcastNewMessage,
  broadcastMessageUpdated,
  broadcastMessageDeleted,
  broadcastNewComment,
  broadcastCommentUpdated,
  broadcastCommentDeleted,
};
