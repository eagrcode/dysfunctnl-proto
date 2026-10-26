const express = require("express");
const request = require("supertest");

const mockQuery = jest.fn();
function mockController(_req, res) {
  res.sendStatus(204);
}

jest.mock("../src/db/pool", () => ({ query: mockQuery }));
jest.mock("../src/lib/logger", () => ({ logger: { debug: jest.fn() } }));
jest.mock("../src/realtime/socket-service", () => ({ broadcastGroupEvent: jest.fn() }));

jest.mock("../src/features/groups/groups.controller", () => ({
  handleCreateGroup: mockController,
  handleGetUserGroups: mockController,
  handleGetGroupById: mockController,
  handleUpdateGroup: mockController,
  handleDeleteGroup: mockController,
  handleCreateGroupInvite: mockController,
}));
jest.mock("../src/features/members/members.controller", () => ({
  handleGetGroupMembers: mockController,
  handleAddUserToGroup: mockController,
  handleGetGroupMemberById: mockController,
  handleUpdateMemberRole: mockController,
  handleRemoveMemberFromGroup: mockController,
}));
jest.mock("../src/features/text-channels/textChannels.controller", () => ({
  handleGetAllTextChannels: mockController,
  handleCreateTextChannel: mockController,
  handleGetTextChannelById: mockController,
  handleUpdateTextChannel: mockController,
  handleDeleteTextChannel: mockController,
}));
jest.mock("../src/features/text-channels/text-channel-messages/textChannelMessages.controller", () => ({
  handleGetAllMessages: mockController,
  handleCreateMessage: mockController,
  handleDeleteMessage: mockController,
  handleUpdateMessage: mockController,
}));
jest.mock("../src/features/dashboard/dashboard.router", () => require("express").Router());
jest.mock("../src/features/calendar/calendar.router", () => require("express").Router());
jest.mock("../src/features/albums/albums.router", () => require("express").Router());
jest.mock("../src/features/lists/lists.model", () => ({
  getAllLists: jest.fn().mockResolvedValue([]),
  renameList: jest.fn().mockResolvedValue({ title: "Updated title" }),
}));
jest.mock("../src/features/lists/list-items/listItems.model", () => ({
  toggleComplete: jest.fn().mockResolvedValue({ completed: true }),
}));

const groupsRouter = require("../src/features/groups/groups.router");
const { getAllLists, renameList } = require("../src/features/lists/lists.model");
const { toggleComplete } = require("../src/features/lists/list-items/listItems.model");

const userId = "11111111-1111-4111-8111-111111111111";
const groupId = "22222222-2222-4222-8222-222222222222";
const listId = "33333333-3333-4333-8333-333333333333";
const itemId = "44444444-4444-4444-8444-444444444444";
const groupPath = `/groups/${groupId}`;
const sharedMember = { group_id: groupId, type: "shared", is_member: true, is_admin: false, is_creator: false };
const sharedAdmin = { ...sharedMember, is_admin: true };
const sharedCreator = { ...sharedAdmin, is_creator: true };
const personalOwner = { ...sharedMember, type: "personal", is_member: false, is_creator: true };

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  req.user = { id: userId };
  next();
});
app.use("/groups", groupsRouter);
app.use((error, _req, res, _next) => {
  res.status(error.statusCode || 500).json({ code: error.code });
});

beforeEach(() => {
  jest.clearAllMocks();
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [sharedMember] });
});

function useMembership(membership) {
  mockQuery.mockResolvedValue({ rows: membership ? [membership] : [] });
}

test.each([
  ["shared member", sharedMember, 200],
  ["shared admin", sharedAdmin, 200],
  ["personal owner without a membership", personalOwner, 200],
  ["shared non-member", { ...sharedMember, is_member: false }, 404],
  ["personal non-owner with a membership", { ...sharedMember, type: "personal" }, 404],
  ["missing group", undefined, 404],
])("list access for %s follows the space access rules", async (_name, membership, status) => {
  useMembership(membership);
  const response = await request(app).get(`${groupPath}/lists`);

  expect(response.status).toBe(status);
  expect(mockQuery).toHaveBeenCalledTimes(1);
  expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [userId, groupId]);
  if (status === 200) {
    expect(getAllLists).toHaveBeenCalledWith(groupId);
  } else {
    expect(getAllLists).not.toHaveBeenCalled();
  }
});

test.each([
  ["shared member", sharedMember, false],
  ["shared admin", sharedAdmin, true],
  ["personal owner", personalOwner, true],
])("list mutations receive the effective permission for %s", async (_name, membership, isAdmin) => {
  useMembership(membership);
  const renameResponse = await request(app)
    .patch(`${groupPath}/lists/${listId}`)
    .send({ newTitle: "Updated title" });

  expect(renameResponse.status).toBe(200);
  expect(renameList).toHaveBeenCalledWith(groupId, listId, "Updated title", isAdmin, userId);
  expect(mockQuery).toHaveBeenCalledTimes(1);

  mockQuery.mockClear();
  const toggleResponse = await request(app)
    .patch(`${groupPath}/lists/${listId}/items/${itemId}/toggle`)
    .send({ completed: true });

  expect(toggleResponse.status).toBe(200);
  expect(toggleComplete).toHaveBeenCalledWith(groupId, listId, itemId, true, isAdmin, userId);
  expect(mockQuery).toHaveBeenCalledTimes(1);
});

test.each([
  ["shared member", "patch", 403, sharedMember],
  ["shared admin", "patch", 204, sharedAdmin],
  ["shared admin", "delete", 403, sharedAdmin],
  ["shared creator", "delete", 204, sharedCreator],
  ["personal owner", "patch", 204, personalOwner],
  ["personal owner", "delete", 204, personalOwner],
])("%s on group %s receives %i", async (_name, method, status, membership) => {
  useMembership(membership);
  const response = await request(app)[method](groupPath);

  expect(response.status).toBe(status);
  expect(mockQuery).toHaveBeenCalledTimes(1);
});

test.each([
  ["post", "/members"],
  ["patch", "/members/role"],
  ["delete", "/members/remove"],
  ["post", "/text-channels"],
  ["patch", `/text-channels/${itemId}`],
  ["delete", `/text-channels/${itemId}`],
])("%s %s enforces the existing admin requirement", async (method, path) => {
  const denied = await request(app)[method](`${groupPath}${path}`);
  expect(denied.status).toBe(403);
  expect(mockQuery).toHaveBeenCalledTimes(1);

  mockQuery.mockClear();
  useMembership(sharedAdmin);
  const allowed = await request(app)[method](`${groupPath}${path}`);
  expect(allowed.status).toBe(204);
  expect(mockQuery).toHaveBeenCalledTimes(1);
});

test("invalid group IDs are rejected before loading access", async () => {
  const response = await request(app).get("/groups/invalid/lists");
  expect(response.status).toBe(400);
  expect(mockQuery).not.toHaveBeenCalled();
});
