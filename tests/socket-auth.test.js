const mockUse = jest.fn();
const mockOn = jest.fn();
const mockSocketServer = {
  use: mockUse,
  on: mockOn,
};

const mockVerify = jest.fn();
const mockGetUserGroups = jest.fn();
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

jest.mock("socket.io", () => ({
  Server: jest.fn(() => mockSocketServer),
}));

jest.mock("jsonwebtoken", () => ({
  verify: mockVerify,
}));

jest.mock("../src/features/groups/groups.model", () => ({
  getUserGroups: mockGetUserGroups,
}));

jest.mock("../src/lib/logger", () => ({
  logger: mockLogger,
}));

jest.mock("../src/config/cors-config", () => ({
  getCorsOptions: jest.fn(() => ({})),
}));

const { SOCKET_AUTH_CODES } = require("../src/lib/errors");
const { initSocketServer } = require("../src/realtime/socket-service");

describe("Socket.IO authentication middleware", () => {
  let authenticateSocket;
  let handleConnection;

  beforeAll(() => {
    initSocketServer({});
    authenticateSocket = mockUse.mock.calls[0][0];
    handleConnection = mockOn.mock.calls.find(([eventName]) => eventName === "connection")[1];
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("rejects a missing token with a structured error code", () => {
    const next = jest.fn();

    authenticateSocket(
      {
        id: "socket-1",
        handshake: { auth: {} },
      },
      next,
    );

    const error = next.mock.calls[0][0];

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("Authentication failed");
    expect(error.data).toEqual({ code: SOCKET_AUTH_CODES.TOKEN_MISSING });
    expect(mockVerify).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledWith("Socket connection attempted without token", {
      socketId: "socket-1",
    });
  });

  test("rejects an expired token with a warning and TOKEN_EXPIRED", () => {
    const next = jest.fn();
    mockVerify.mockImplementation((_token, _secret, callback) => {
      callback({ name: "TokenExpiredError", message: "jwt expired" });
    });

    authenticateSocket(
      {
        id: "socket-2",
        handshake: { auth: { token: "expired-token" } },
      },
      next,
    );

    const error = next.mock.calls[0][0];

    expect(error.data).toEqual({ code: SOCKET_AUTH_CODES.TOKEN_EXPIRED });
    expect(mockLogger.warn).toHaveBeenCalledWith("Socket access token expired", {
      socketId: "socket-2",
      name: "TokenExpiredError",
      message: "jwt expired",
    });
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  test("rejects another verification failure with TOKEN_INVALID", () => {
    const next = jest.fn();
    mockVerify.mockImplementation((_token, _secret, callback) => {
      callback({ name: "JsonWebTokenError", message: "invalid signature" });
    });

    authenticateSocket(
      {
        id: "socket-3",
        handshake: { auth: { token: "invalid-token" } },
      },
      next,
    );

    const error = next.mock.calls[0][0];

    expect(error.data).toEqual({ code: SOCKET_AUTH_CODES.TOKEN_INVALID });
    expect(mockLogger.error).toHaveBeenCalledWith("Socket access token invalid", {
      socketId: "socket-3",
      name: "JsonWebTokenError",
      message: "invalid signature",
    });
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  test("signals readiness only after the authenticated socket joins its rooms", async () => {
    const socket = {
      id: "socket-4",
      user: { id: "user-1" },
      connected: true,
      rooms: new Set(["socket-4", "user:user-1", "group:group-1"]),
      join: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn(),
      on: jest.fn(),
    };
    mockGetUserGroups.mockResolvedValue([{ id: "group-1" }]);

    await handleConnection(socket);

    expect(socket.join).toHaveBeenCalledWith(["user:user-1", "group:group-1"]);
    expect(socket.emit).toHaveBeenCalledWith("socket_ready");
    expect(socket.join.mock.invocationCallOrder[0]).toBeLessThan(
      socket.emit.mock.invocationCallOrder[0],
    );
  });

  test("does not join rooms or signal readiness after disconnecting during group lookup", async () => {
    const socket = {
      id: "socket-5",
      user: { id: "user-1" },
      connected: true,
      rooms: new Set(["socket-5"]),
      join: jest.fn(),
      emit: jest.fn(),
      on: jest.fn(),
    };
    mockGetUserGroups.mockImplementation(async () => {
      socket.connected = false;
      return [{ id: "group-1" }];
    });

    await handleConnection(socket);

    expect(socket.join).not.toHaveBeenCalled();
    expect(socket.emit).not.toHaveBeenCalledWith("socket_ready");
  });

  test("reports a transient group initialisation failure before disconnecting", async () => {
    const socket = {
      id: "socket-6",
      user: { id: "user-1" },
      connected: true,
      rooms: new Set(["socket-6"]),
      join: jest.fn(),
      emit: jest.fn(),
      on: jest.fn(),
      disconnect: jest.fn(),
    };
    mockGetUserGroups.mockRejectedValue(new Error("database unavailable"));

    await handleConnection(socket);

    expect(socket.emit).toHaveBeenCalledWith("socket_groups_init_error", {
      code: "INITIALISATION_FAILED",
      message: "Unable to initialise groups connection",
    });
    expect(socket.disconnect).toHaveBeenCalledWith(true);
  });
});
