const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

let io = null;

const initSocketServer = (httpServer) => {
  if (io) {
    console.log("Socket.IO already initialised");
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
      socket.join(roomName);
      socket.emit("joined_channel", { type, ids, roomName });
      console.log(`User ${socket.user.id} joined room: ${roomName}`);
    });

    // Leave channel
    socket.on("leave_channel", (type, ids) => {
      const roomName = getRoom(type, ids);
      socket.leave(roomName);
      socket.emit("left_channel", { type, ids, roomName });
      console.log(`User ${socket.user.id} left room: ${roomName}`);
    });

    // Disconnection handler
    socket.on("disconnect", (reason) => {
      console.log(`Client disconnected: ${socket.id} (${reason})`);
    });

    // Error handler
    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });
  });

  console.log("Socket.io server initialised");
  return io;
};

const getRoom = (type, ids) => {
  if (type === "text_channel") {
    return `group_${ids.groupId}_channel_${ids.textChannelId}`;
  }
  if (type === "image") {
    return `group_${ids.groupId}_image_${ids.imageId}`;
  }
  throw new Error("Invalid room type");
};

const broadcast = (eventType, channelType, ids, payload) => {
  if (!io) {
    throw new Error("SocketService not initialised");
  }
  const roomName = getRoom(channelType, ids);
  console.log(`Broadcasting...`, {
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

const broadcastNewComment = ({ groupId, imageId, payload }) =>
  broadcast("new_comment", "image", { groupId, imageId }, payload);

const broadcastCommentUpdated = ({ groupId, imageId, payload }) =>
  broadcast("comment_updated", "image", { groupId, imageId }, payload);

const broadcastCommentDeleted = ({ groupId, imageId, payload }) =>
  broadcast("comment_deleted", "image", { groupId, imageId }, payload);

module.exports = {
  initSocketServer,
  broadcastNewMessage,
  broadcastMessageUpdated,
  broadcastMessageDeleted,
  broadcastNewComment,
  broadcastCommentUpdated,
  broadcastCommentDeleted,
};
