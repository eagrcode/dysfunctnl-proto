const { EventEmitter } = require("node:events");

const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
const mockVerify = jest.fn();

jest.mock("../src/lib/logger", () => ({ logger: mockLogger }));
jest.mock("jsonwebtoken", () => ({ verify: mockVerify }));
jest.mock("express-rate-limit", () => jest.fn((options) => options));

const requestLogger = require("../src/http/middleware/reqLogger");
const authenticate = require("../src/http/middleware/auth");
const { errorHandler } = require("../src/http/middleware/errorHandler");
const limiters = require("../src/http/middleware/rateLimiters");
const { ValidationError, NotFoundError } = require("../src/lib/errors");

const createRequest = (overrides = {}) => {
  const req = {
    method: "GET",
    originalUrl: "/groups?token=query-secret",
    headers: { authorization: "Bearer header-secret" },
    body: { password: "body-secret" },
    get(name) {
      return this.headers[name.toLowerCase()];
    },
    ...overrides,
  };
  const res = Object.assign(new EventEmitter(), {
    locals: {},
    statusCode: 200,
    headersSent: false,
    writableFinished: false,
    headers: {},
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    status(value) {
      this.statusCode = value;
      return this;
    },
    json(body) {
      this.body = body;
      this.headersSent = true;
      this.writableFinished = true;
      this.emit("finish");
      this.emit("close");
      return this;
    },
  });
  const next = jest.fn();

  requestLogger(req, res, next);
  expect(next).toHaveBeenCalledTimes(1);

  return { req, res };
};

const outcomes = () =>
  ["info", "warn", "error"].flatMap((level) =>
    mockLogger[level].mock.calls.map(([message, data]) => ({ level, message, data })),
  );

const allLogs = () => JSON.stringify(Object.values(mockLogger).flatMap((log) => log.mock.calls));

beforeEach(() => {
  jest.clearAllMocks();
  mockVerify.mockReset();
});

describe("request outcomes", () => {
  test.each([
    [200, "info", "Request completed"],
    [302, "info", "Request completed"],
    [404, "warn", "Request rejected"],
    [500, "error", "Request failed"],
  ])("records one %i outcome at %s", (statusCode, level, message) => {
    const { req, res } = createRequest();
    res.status(statusCode).json({ token: "response-secret" });

    expect(req.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(res.headers["x-request-id"]).toBe(req.requestId);
    expect(outcomes()).toEqual([
      {
        level,
        message,
        data: expect.objectContaining({
          method: "GET",
          path: "/groups",
          requestId: req.requestId,
          statusCode,
          durationMs: expect.any(Number),
        }),
      },
    ]);
    expect(outcomes()[0].data.durationMs).toBeGreaterThanOrEqual(0);
    expect(allLogs()).not.toMatch(/query-secret|header-secret|body-secret|response-secret/);
  });

  test.each([false, true])("records a premature close once (headers sent: %s)", (headersSent) => {
    const { res } = createRequest();
    res.headersSent = headersSent;
    res.emit("close");
    res.emit("close");
    res.emit("finish");

    expect(outcomes()).toEqual([
      {
        level: "warn",
        message: "Request aborted",
        data: expect.objectContaining({ statusCode: headersSent ? 200 : null }),
      },
    ]);
  });

  test("logs an aborted 5xx response at error level without exception metadata", () => {
    const { res } = createRequest();
    res.statusCode = 503;
    res.headersSent = true;
    res.emit("close");

    expect(outcomes()).toEqual([
      {
        level: "error",
        message: "Request aborted",
        data: expect.objectContaining({ statusCode: 503 }),
      },
    ]);
  });
});

describe("authentication rejections", () => {
  test.each([
    [undefined, undefined, "ACCESS_TOKEN_MISSING", "Access token required", "Access token required"],
    ["Basic credential-secret", undefined, "ACCESS_TOKEN_INVALID", "Invalid token", "Invalid token"],
    ["Bearer token-secret", "TokenExpiredError", "ACCESS_TOKEN_EXPIRED", "Invalid token", "Access token expired"],
    ["Bearer token-secret", "JsonWebTokenError", "ACCESS_TOKEN_INVALID", "Invalid token", "invalid signature"],
  ])("logs %s rejection through the request outcome", (authorization, name, code, message, reason) => {
    mockVerify.mockImplementation((_token, _secret, callback) => {
      callback({ name, message: name === "TokenExpiredError" ? "jwt expired" : "invalid signature" });
    });
    const { req, res } = createRequest({ headers: { authorization } });
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ code, message });
    expect(next).not.toHaveBeenCalled();
    expect(outcomes()).toEqual([
      {
        level: "warn",
        message: "Request rejected",
        data: expect.objectContaining({ statusCode: 401, code, reason }),
      },
    ]);
    expect(allLogs()).not.toMatch(/credential-secret|token-secret/);
    if (!name) expect(mockVerify).not.toHaveBeenCalled();
  });

  test("successful authentication still passes the verified user downstream", () => {
    const user = { id: "user-1" };
    mockVerify.mockImplementation((_token, _secret, callback) => callback(null, user));
    const { req, res } = createRequest();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(req.user).toBe(user);
    expect(next).toHaveBeenCalledTimes(1);
    expect(outcomes()).toEqual([]);
    res.json({ ok: true });
    expect(outcomes()).toHaveLength(1);
    expect(outcomes()[0].level).toBe("info");
  });
});

describe("error-handler diagnostics", () => {
  test("preserves operational error responses without duplicate logs", () => {
    const { req, res } = createRequest();

    errorHandler(new NotFoundError("List not found"), req, res, jest.fn());

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ code: "NOT_FOUND", message: "List not found" });
    expect(outcomes()).toEqual([
      {
        level: "warn",
        message: "Request rejected",
        data: expect.objectContaining({ code: "NOT_FOUND", reason: "List not found" }),
      },
    ]);
  });

  test("keeps validation field messages but excludes submitted values", () => {
    const { req, res } = createRequest();
    const error = new ValidationError("Validation failed", [
      { path: "password", msg: "Must be at least 12 characters", value: "submitted-secret" },
    ]);

    errorHandler(error, req, res, jest.fn());

    const errors = [{ field: "password", message: "Must be at least 12 characters" }];
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ code: "VALIDATION_ERROR", message: "Validation failed", errors });
    expect(outcomes()).toHaveLength(1);
    expect(outcomes()[0].data).toMatchObject({ code: "VALIDATION_ERROR", errors });
    expect(allLogs()).not.toContain("submitted-secret");
  });

  test.each([
    ["entity.parse.failed", 400, "INVALID_JSON", "Invalid JSON request body"],
    ["entity.too.large", 413, "REQUEST_TOO_LARGE", "Request body too large"],
  ])("sanitizes %s without exposing parser input", (type, statusCode, code, message) => {
    const { req, res } = createRequest();
    const error = Object.assign(new SyntaxError("Unexpected token in parser-input-secret"), {
      type,
      status: statusCode,
      body: "parser-body-secret",
    });

    errorHandler(error, req, res, jest.fn());

    expect(res.statusCode).toBe(statusCode);
    expect(res.body).toEqual({ code, message });
    expect(outcomes()).toEqual([
      {
        level: "warn",
        message: "Request rejected",
        data: expect.objectContaining({ statusCode, code, reason: message }),
      },
    ]);
    expect(outcomes()[0].data).not.toHaveProperty("stack");
    expect(allLogs()).not.toMatch(/parser-input-secret|parser-body-secret/);
  });

  test("keeps unexpected failure diagnostics internal and returns a generic 500", () => {
    const { req, res } = createRequest();
    const error = Object.assign(new Error("Database connection unavailable"), {
      code: "ECONNREFUSED",
    });

    errorHandler(error, req, res, jest.fn());

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ code: "INTERNAL_ERROR", message: "An unexpected error occurred" });
    expect(outcomes()).toEqual([
      {
        level: "error",
        message: "Request failed",
        data: expect.objectContaining({
          code: "INTERNAL_ERROR",
          reason: error.message,
          errorName: "Error",
          errorCode: "ECONNREFUSED",
          stack: error.stack,
        }),
      },
    ]);
  });

  test("retains failure diagnostics if an already-started response is aborted", () => {
    const { req, res } = createRequest();
    const error = new Error("Streaming response failed");
    const next = jest.fn();
    res.headersSent = true;

    errorHandler(error, req, res, next);
    expect(next).toHaveBeenCalledWith(error);
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeUndefined();
    expect(outcomes()).toEqual([]);
    res.emit("close");

    expect(outcomes()).toHaveLength(1);
    expect(outcomes()[0]).toMatchObject({
      level: "error",
      message: "Request aborted",
      data: {
        statusCode: 200,
        code: "INTERNAL_ERROR",
        reason: error.message,
        stack: error.stack,
      },
    });
  });
});

describe("rate-limit rejections", () => {
  test.each(Object.entries(limiters))("%s retains its response and records a reason", (_name, options) => {
    const { req, res } = createRequest();
    const next = jest.fn();

    options.handler(req, res, next, { ...options, statusCode: 429 });

    expect(res.statusCode).toBe(429);
    expect(res.body).toEqual(options.message);
    expect(next).not.toHaveBeenCalled();
    expect(outcomes()).toEqual([
      {
        level: "warn",
        message: "Request rejected",
        data: expect.objectContaining({
          statusCode: 429,
          code: "LIMIT_EXCEEDED",
          reason: options.message.message,
        }),
      },
    ]);
  });
});
