const request = require("supertest");
const app = require("../../../app");
const dotenv = require("dotenv");
const {
  loginUser,
  createGroup,
  addMember,
  registerUser,
} = require("../../../_shared/helpers/testSetup");

dotenv.config();

describe("Lists API Integration Tests - Authorised Actions (as Admin or Member)", () => {
  let adminAccessToken;
  let adminUserId;
  let groupId;
  let listId;
  let nonAdminAccessToken;
  let nonAdminUserId;
  let listItemId;

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

    const { success, role } = await addMember(groupId, nonAdminUserId, adminAccessToken);
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

        console.log(`CREATE LIST OF TYPE: ${listType}`, JSON.stringify(response.body, null, 2));

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

  // ADD ITEM TO LIST
  describe("Add Item to List", () => {
    test("should add an item to the list", async () => {
      const itemData = {
        content: "Test Item",
      };

      const response = await request(app)
        .post(`/groups/${groupId}/lists/${listId}/items`)
        .send({ data: itemData })
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${nonAdminAccessToken}`);

      console.log(`ADD ITEM TO LIST`, JSON.stringify(response.body, null, 2));

      listItemId = response.body.data.id;

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: expect.any(String),
        list_id: listId,
        content: itemData.content,
        completed: false,
        created_at: expect.any(String),
        updated_at: null,
      });
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

  // GET LIST ITEM BY ID
  describe("Get List Item by ID", () => {
    test("should retrieve a specific list item by its ID", async () => {
      const response = await request(app)
        .get(`/groups/${groupId}/lists/${listId}/items/${listItemId}`)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${nonAdminAccessToken}`);

      console.log(`GET LIST ITEM BY ID`, JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(listItemId);
    });
  });

  // UPDATE LIST ITEM
  describe("Update list item", () => {
    test("should update the list item", async () => {
      const newItemData = {
        content: "New test Item",
      };

      const response = await request(app)
        .patch(`/groups/${groupId}/lists/${listId}/items/${listItemId}`)
        .send({ data: newItemData })
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${nonAdminAccessToken}`);

      console.log(`UPDATE LIST ITEM`, JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: listItemId,
        list_id: listId,
        content: newItemData.content,
        completed: false,
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });
    });
  });

  // TOGGLE COMPLETE STATUS OF LIST ITEM
  describe("Toggle Complete Status of List Item", () => {
    test("should toggle the complete status of the list item", async () => {
      const toggleData = {
        completed: true,
      };

      const response = await request(app)
        .patch(`/groups/${groupId}/lists/${listId}/items/${listItemId}/toggle`)
        .send({ data: toggleData })
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${nonAdminAccessToken}`);

      console.log(`TOGGLE COMPLETE STATUS`, JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.completed).toBe(true);
    });
  });

  // CHECK COMPLETED STATUS OF LIST AFTER COMPLETING ALL ITEMS IN LIST
  describe("Get List by ID and check competed status", () => {
    test("should retrieve a specific list by its ID", async () => {
      const response = await request(app)
        .get(`/groups/${groupId}/lists/${listId}`)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${adminAccessToken}`);

      console.log(
        `GET LIST BY ID - CHECK COMPLETED STATUS`,
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(listId);
      expect(response.body.data.completed).toBe(true);
      expect(response.body.data.completed_at).toBeDefined();
    });
  });

  // DELETE LIST ITEM
  describe("Delete List Item", () => {
    test("should delete the list item by its ID", async () => {
      const response = await request(app)
        .delete(`/groups/${groupId}/lists/${listId}/items/${listItemId}`)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${nonAdminAccessToken}`);

      console.log(`DELETE LIST ITEM`, JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(listItemId);
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
