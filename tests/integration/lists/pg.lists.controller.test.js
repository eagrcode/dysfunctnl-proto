const request = require("supertest");
const app = require("../../../app");
const dotenv = require("dotenv");
const {
  loginUser,
  createGroup,
  addMember,
  registerUser,
} = require("../../helpers/setup");

dotenv.config();

describe("Lists API Integration Tests - Authorised Actions (as Admin or Member)", () => {
  let adminAccessToken;
  let adminUserId;
  let groupId;
  let listId;
  let nonAdminAccessToken;
  let nonAdminUserId;

  const groupData = {
    name: "Test Group",
    description: "Test description",
  };

  // Initial setup: Login as admin and create a group
  beforeAll(async () => {
    const { user, accessToken } = await loginUser(process.env.TEST_USER_1);
    adminUserId = user.id;
    adminAccessToken = accessToken;

    groupId = await createGroup(groupData, adminAccessToken);

    // Register, login, and add non-admin member to group
    const { email: naEmail, userId: naUserId } = await registerUser();
    nonAdminUserId = naUserId;

    nonAdminAccessToken = (await loginUser(naEmail)).accessToken;

    const { success, role } = await addMember(
      groupId,
      nonAdminUserId,
      adminAccessToken
    );
    expect(success).toBe(true);
    expect(role.is_admin).toBe(false);
  });

  // Cleanup: Delete the created group
  afterAll(async () => {
    if (groupId) {
      await request(app)
        .delete(`/groups/${groupId}`)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${adminAccessToken}`);
    }
  });

  // CREATE NEW LIST
  describe("Create New List", () => {
    test.each([
      {
        listType: "shopping",
        title: "Shopping List",
        dueDate: null,
      },
      {
        listType: "todo",
        title: "To-Do List",
      },
      {
        listType: "other",
        title: "Other List",
      },
    ])(
      "should create a new $listType list with the title $title in the group",
      async ({ listType, title }) => {
        const dueDate = new Date();
        dueDate.setUTCDate(dueDate.getUTCDate() + 7);
        dueDate.setUTCHours(0, 0, 0, 0);

        const listData = {
          createdBy: adminUserId,
          listType: listType,
          title: title,
          assignedTo: nonAdminUserId,
          dueDate: dueDate.toISOString(),
        };

        const acceptedListTypes = (listType) => {
          const types = ["shopping", "todo", "other"];
          return types.includes(listType);
        };

        const response = await request(app)
          .post(`/groups/${groupId}/lists`)
          .send({ data: listData })
          .set("Content-Type", "application/json")
          .set("Authorization", `Bearer ${adminAccessToken}`);

        console.log("Received due_date:", response.body.data.due_date);

        console.log(
          `CREATE LIST OF TYPE: ${listType}`,
          JSON.stringify(response.body, null, 2)
        );

        listId = response.body.data.id;

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(acceptedListTypes(response.body.data.list_type)).toBe(true);
        expect(response.body.data).toMatchObject({
          id: expect.any(String),
          group_id: groupId,
          assigned_to: listData.assignedTo,
          created_by: adminUserId,
          list_type: listData.listType,
          title: listData.title,
          completed: false,
          due_date: dueDate.toISOString(),
          created_at: expect.any(String),
          updated_at: null,
          completed_at: null,
        });
      }
    );
  });

  // GET ALL LISTS
  describe("Get All Lists", () => {
    test("should retrieve all lists for a group", async () => {
      const response = await request(app)
        .get(`/groups/${groupId}/lists`)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${adminAccessToken}`);

      console.log(`GET LISTS`, JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  // GET LIST BY ID
  describe("Get List by ID", () => {
    test("should retrieve a specific list by its ID", async () => {
      const response = await request(app)
        .get(`/groups/${groupId}/lists/${listId}`)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${adminAccessToken}`);

      console.log(`GET LIST BY ID`, JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(listId);
    });
  });

  // UPDATE LIST
  describe("Update List", () => {
    test("should update the list's title and list type", async () => {
      const dueDate = new Date();
      dueDate.setUTCDate(dueDate.getUTCDate() + 14);
      dueDate.setUTCHours(0, 0, 0, 0);

      const updates = {
        title: "Updated List Title",
        listType: "todo",
        assignedTo: null,
        dueDate: dueDate.toISOString(),
      };

      const response = await request(app)
        .patch(`/groups/${groupId}/lists/${listId}`)
        .send({ data: updates })
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${adminAccessToken}`);

      console.log(`UPDATE LIST`, JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updates.title);
      expect(response.body.data.list_type).toBe(updates.listType);
      expect(response.body.data.updated_at).toBeDefined();
      expect(response.body.data.due_date).toBe(dueDate.toISOString());
    });
  });

  // DELETE LIST
  describe("Delete List", () => {
    test("should delete the list by its ID", async () => {
      const response = await request(app)
        .delete(`/groups/${groupId}/lists/${listId}`)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${adminAccessToken}`);

      console.log(`DELETE LIST`, JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(listId);
    });
  });
});
