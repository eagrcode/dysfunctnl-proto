const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const customConsoleLog = require("./customConsoleLog");
const { handleCheckGroupMembership } = require("./socketCheckGroupMembership");
const { handleCheckUserGroups } = require("./checkUserGroups");
const { NotFoundError } = require("./errors");
const { logger } = require("../../_shared/logger/logger");
const { getCorsOptions } = require("./corsConfig");

let io = null;

const rooms = {
  user: (userId) => `user:${userId}`,
  group: (groupId) => `group:${groupId}`,
};

const initSocketServer = (httpServer) => {
  if (io) {
    logger.info("Socket.IO already initialised");
    return io;
  }

  io = new Server(httpServer, {
    cors: getCorsOptions(),
  });

  // Middleware for JWT authentication
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      logger.error("Socket authentication failed: missing token");
      return next(new Error("Authentication failed"));
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        logger.error("Socket authentication failed:", {
          reason: err.message,
        });

        return next(new Error("Authentication failed"));
      }

      socket.user = user;

      logger.info("Socket authenticated:", {
        userId: user.id,
      });

      next();
    });
  });

  // Connection handler
  io.on("connection", async (socket) => {
    const userId = socket.user.id;

    try {
      const groupIds = await handleCheckUserGroups(userId);

      if (groupIds.length === 0) {
        logger.error("Protected socket connected without groups", {
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

      logger.info("Client connected", {
        socketId: socket.id,
        userId,
        groupIds,
        rooms: [...socket.rooms],
      });

      socket.on("disconnect", (reason) => {
        logger.info("Client disconnected:", {
          socketId: socket.id,
          userId: socket.user.id,
          reason,
        });
      });
    } catch (error) {
      logger.error("Socket initialisation failed", {
        socketId: socket.id,
        userId,
        reason: error,
      });

      socket.emit("socket_groups_init_error", {
        code: "INITIALISATION_FAILED",
        message: "Unable to initialise groups connection",
      });

      socket.disconnect(true);
    }

    // io.to(rooms.group("3af9bb7d-a17e-4133-8a74-ea0c5c8c4881")).emit("group_event", {
    //   groupId: "3af9bb7d-a17e-4133-8a74-ea0c5c8c4881",
    //   type: "list.created",
    //   data: "list has been created",
    // });

    // // Join Group Channel
    // socket.on("join_group_channel", async (groupId) => {
    //   const userId = socket.user.id;

    //   const isMember = await handleCheckGroupMembership(userId, groupId);
    //   if (!isMember) {
    //     customConsoleLog("Unauthorised channel join attempt:", {
    //       userId,
    //       groupId,
    //     });
    //     return socket.emit("error", "You are not a member of this group");
    //   }

    //   socket.join(groupId);
    //   customConsoleLog("User joined group channel:", {
    //     userId: socket.user.id,
    //     groupId,
    //   });
    //   socket.emit("joined_group_channel", { groupId });
    // });

    // // Join channel
    // socket.on("join_channel", async (type, ids) => {
    //   // Validate user is member of the group before allowing them to join the channel
    //   const groupId = ids.groupId;
    //   const userId = socket.user.id;

    //   const isMember = await handleCheckGroupMembership(userId, groupId);
    //   if (!isMember) {
    //     customConsoleLog("Unauthorised channel join attempt:", {
    //       userId,
    //       groupId,
    //     });
    //     return socket.emit("error", "You are not a member of this group");
    //   }

    //   const roomName = getRoom(type, ids);
    //   socket.join(roomName);
    //   customConsoleLog("User joined room:", {
    //     userId: socket.user.id,
    //     roomName,
    //   });
    //   socket.emit("joined_channel", { type, ids, roomName });
    // });

    // // Leave channel
    // socket.on("leave_channel", (type, ids) => {
    //   const roomName = getRoom(type, ids);
    //   socket.leave(roomName);
    //   customConsoleLog("User left room:", {
    //     userId: socket.user.id,
    //     roomName,
    //   });
    //   socket.emit("left_channel", { type, ids, roomName });
    // });

    socket.on("error", (error) => {
      logger.error("Socket error:", error);
    });
  });

  customConsoleLog("Socket.io server initialised");
  return io;
};

const broadcastGroupEvent = (groupId, type, payload) => {
  if (!io) {
    throw new Error("SocketService not initialised");
  }

  io.to(rooms.group(groupId)).emit("group_event", {
    groupId: groupId,
    type: type,
    data: payload,
  });

  logger.info("Broadcasted group event", {
    groupId,
    type,
    payload,
  });
};

// const getRoom = (type, ids) => {
//   customConsoleLog("Structuring room name from details:", { type, ids });
//   if (type === "text_channel") {
//     return `group_${ids.groupId}_channel_${ids.textChannelId}`;
//   }
//   if (type === "image") {
//     return `group_${ids.groupId}_image_${ids.mediaId}`;
//   }
//   throw new Error("Invalid room type");
// };

// const broadcast = (eventType, channelType, ids, payload) => {
//   if (!io) {
//     throw new Error("SocketService not initialised");
//   }
//   const roomName = getRoom(channelType, ids);
//   customConsoleLog(`Broadcasting...`, {
//     eventType,
//     roomName,
//     payload,
//   });
//   io.to(roomName).emit(eventType, payload);
// };

// const broadcastNewMessage = ({ groupId, textChannelId, payload }) =>
//   broadcast("new_message", "text_channel", { groupId, textChannelId }, payload);

// const broadcastMessageUpdated = ({ groupId, textChannelId, payload }) =>
//   broadcast("message_updated", "text_channel", { groupId, textChannelId }, payload);

// const broadcastMessageDeleted = ({ groupId, textChannelId, payload }) =>
//   broadcast("message_deleted", "text_channel", { groupId, textChannelId }, payload);

// const broadcastNewComment = ({ groupId, mediaId, payload }) =>
//   broadcast("new_comment", "image", { groupId, mediaId }, payload);

// const broadcastCommentUpdated = ({ groupId, mediaId, payload }) =>
//   broadcast("comment_updated", "image", { groupId, mediaId }, payload);

// const broadcastCommentDeleted = ({ groupId, mediaId, payload }) =>
//   broadcast("comment_deleted", "image", { groupId, mediaId }, payload);

module.exports = {
  initSocketServer,
  broadcastGroupEvent,
  // broadcastNewMessage,
  // broadcastMessageUpdated,
  // broadcastMessageDeleted,
  // broadcastNewComment,
  // broadcastCommentUpdated,
  // broadcastCommentDeleted,
};
