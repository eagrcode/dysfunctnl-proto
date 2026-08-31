const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { getUserGroups } = require("../features/groups/groups.model");
const { logger } = require("../lib/logger");
const { SOCKET_AUTH_CODES } = require("../lib/errors");
const { getCorsOptions } = require("../config/cors-config");

let io = null;

const MAX_DISCONNECTION_DURATION = 2 * 60 * 1000; // 2 minutes

const rooms = {
  user: (userId) => `user:${userId}`,
  group: (groupId) => `group:${groupId}`,
};

const initSocketServer = (httpServer) => {
  if (io) {
    logger.debug("Socket.IO already initialised");
    return io;
  }

  io = new Server(httpServer, {
    connectionStateRecovery: {
      maxDisconnectionDuration: MAX_DISCONNECTION_DURATION, // 2 minutes
      skipMiddlewares: false,
    },
    cors: getCorsOptions(),
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      logger.warn("Socket connection attempted without token", {
        socketId: socket.id,
      });

      const error = new Error("Authentication failed");

      error.data = {
        code: SOCKET_AUTH_CODES.TOKEN_MISSING,
      };

      return next(error);
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        const isExpired = err.name === "TokenExpiredError";
        const code = isExpired ? SOCKET_AUTH_CODES.TOKEN_EXPIRED : SOCKET_AUTH_CODES.TOKEN_INVALID;
        const logAuthFailure = isExpired ? logger.warn : logger.error;

        logAuthFailure(isExpired ? "Socket access token expired" : "Socket access token invalid", {
          socketId: socket.id,
          name: err.name,
          message: err.message,
        });

        const error = new Error("Authentication failed");

        error.data = {
          code,
        };

        return next(error);
      }

      socket.user = user;
      next();
    });
  });

  io.on("connection", async (socket) => {
    const userId = socket.user?.id;

    if (socket.recovered) {
      logger.info("Client reconnected", {
        socketId: socket.id,
        userId,
        rooms: [...socket.rooms],
      });
    }

    socket.on("disconnect", (reason) => {
      logger.info("Client disconnected:", {
        socketId: socket.id,
        userId,
        reason,
      });
    });

    try {
      const groups = await getUserGroups(userId);
      const groupIds = groups.map((group) => group.id);

      if (!socket.connected) {
        return;
      }

      if (groupIds.length === 0) {
        logger.warn("Protected socket connected without groups", {
          socketId: socket.id,
          userId,
        });

        socket.emit("socket_groups_init_error", {
          code: "GROUPS_NOT_FOUND",
          message: "User groups could not be retrieved",
        });

        return socket.disconnect(true);
      }

      await socket.join([rooms.user(userId), ...groupIds.map(rooms.group)]);

      if (!socket.connected) {
        return;
      }

      logger.info("Client connected", {
        socketId: socket.id,
        userId,
        groupIds,
        rooms: [...socket.rooms],
      });

      // The namespace connect event fires before this async room setup completes.
      socket.emit("socket_ready");
    } catch (error) {
      logger.error("Socket initialisation failed", {
        socketId: socket.id,
        userId,
        reason: error,
      });

      if (socket.connected) {
        socket.emit("socket_groups_init_error", {
          code: "INITIALISATION_FAILED",
          message: "Unable to initialise groups connection",
        });

        socket.disconnect(true);
      }
    }

    socket.on("error", (error) => {
      logger.error("Socket error:", error);
    });
  });

  return io;
};

const emitToGroup = (groupId, eventName, payload) => {
  if (!io) {
    throw new Error("SocketService not initialised");
  }

  io.to(rooms.group(groupId)).emit(eventName, payload);

  logger.debug("Broadcasted group event", {
    groupId,
    eventName,
    payloadId: payload.id ?? payload.data?.id,
  });
};

const broadcastGroupEvent = (groupId, type, payload, callerSocketId) => {
  emitToGroup(groupId, "group_event", {
    groupId: groupId,
    type: type,
    data: payload,
    callerSocketId: callerSocketId,
  });
};

const broadcastNewMessage = ({ groupId, payload }) => emitToGroup(groupId, "new_message", payload);

const broadcastMessageUpdated = ({ groupId, payload }) =>
  emitToGroup(groupId, "message_updated", payload);

const broadcastMessageDeleted = ({ groupId, payload }) =>
  emitToGroup(groupId, "message_deleted", payload);

const broadcastNewComment = ({ groupId, payload }) => emitToGroup(groupId, "new_comment", payload);

const broadcastCommentUpdated = ({ groupId, payload }) =>
  emitToGroup(groupId, "comment_updated", payload);

const broadcastCommentDeleted = ({ groupId, payload }) =>
  emitToGroup(groupId, "comment_deleted", payload);

module.exports = {
  initSocketServer,
  broadcastGroupEvent,
  broadcastNewMessage,
  broadcastMessageUpdated,
  broadcastMessageDeleted,
  broadcastNewComment,
  broadcastCommentUpdated,
  broadcastCommentDeleted,
};
