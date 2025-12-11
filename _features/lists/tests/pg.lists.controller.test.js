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
  let adminCreatedListId;
  let memberCreatedListId;
  let memberCreatedListId2;
  let nonAdminAccessToken;
  let nonAdminUserId;
  let adminCreatedListIdListItemIds = [];
  let memberCreatedListIdListItemIds = [];

  const groupData = {
    name: "Test Group",
    description: "Test description",
  };

  // Initial setup
  beforeAll(async () => {
    // Register admin/creator user
    const { userId, email } = await registerUser();
    adminUserId = userId;
    const { accessToken } = await loginUser(email);
    adminAccessToken = accessToken;

    // Create group as admin
    groupId = await createGroup(groupData, adminAccessToken);

    // Register member user
    const { email: naEmail, userId: naUserId } = await registerUser();
    nonAdminUserId = naUserId;
    nonAdminAccessToken = (await loginUser(naEmail)).accessToken;

    // Add member to group
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
        role: "Admin",
        userId: () => adminUserId,
        accessToken: () => adminAccessToken,
        listType: "shopping",
        title: "Shopping List",
        assignedTo: () => nonAdminUserId,
        testName: "Admin creates shopping list and assigns to member",
      },
      {
        role: "Member",
        userId: () => nonAdminUserId,
        accessToken: () => nonAdminAccessToken,
        listType: "todo",
        title: "To-Do List",
        assignedTo: () => adminUserId,
        testName: "Member creates todo list and assigns to admin",
        memberListNo: 1,
      },
      {
        role: "Member",
        userId: () => nonAdminUserId,
        accessToken: () => nonAdminAccessToken,
        listType: "todo",
        title: "To-Do List",
        assignedTo: () => adminUserId,
        testName: "Member creates todo list and assigns to themself",
        memberListNo: 2,
      },
    ])(
      "$testName",
      async ({ role, userId, accessToken, assignedTo, listType, title, memberListNo }) => {
        const dueDate = new Date();
        dueDate.setUTCDate(dueDate.getUTCDate() + 7);
        dueDate.setUTCHours(0, 0, 0, 0);

        const listData = {
          listType: listType,
          title: title,
          assignedTo: assignedTo(),
        };

        const acceptedListTypes = (listType) => {
          const types = ["shopping", "todo", "other"];
          return types.includes(listType);
        };

        const response = await request(app)
          .post(`/groups/${groupId}/lists`)
          .send({ listData })
          .set("Content-Type", "application/json")
          .set("Authorization", `Bearer ${accessToken()}`);

        console.log(`CREATE LIST AS ${role.toUpperCase()}`, JSON.stringify(response.body, null, 2));

        if (userId() === adminUserId) {
          adminCreatedListId = response.body.data.id;
        }

        if (userId() === nonAdminUserId && memberListNo === 1) {
          memberCreatedListId = response.body.data.id;
        }

        if (userId() === nonAdminUserId && memberListNo === 2) {
          memberCreatedListId2 = response.body.data.id;
        }

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(acceptedListTypes(response.body.data.list_type)).toBe(true);
        expect(response.body.data).toMatchObject({
          id: expect.any(String),
          group_id: groupId,
          assigned_to: listData.assignedTo,
          created_by: userId(),
          list_type: listData.listType,
          title: listData.title,
          completed: false,
          created_at: expect.any(String),
          updated_at: null,
          completed_at: null,
        });
      }
    );
  });

  // GET ALL LISTS
  describe("Get All Lists", () => {
    test.each([
      {
        role: "Admin",
        accessToken: () => adminAccessToken,
        testName: "should retrieve all lists for a group, as Admin",
      },
      {
        role: "Member",
        accessToken: () => nonAdminAccessToken,
        testName: "should retrieve all lists for a group, as Member",
      },
    ])("$testName", async ({ role, accessToken }) => {
      const response = await request(app)
        .get(`/groups/${groupId}/lists`)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${accessToken()}`);

      console.log(`GET LISTS AS ${role}`, JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  // ADD ITEM TO LIST
  describe("Add Item to List", () => {
    test.each([
      {
        role: "Admin",
        accessToken: () => adminAccessToken,
        listId: () => adminCreatedListId,
        testName: "should add an item to own list, as Admin",
      },
      {
        role: "Member",
        accessToken: () => nonAdminAccessToken,
        listId: () => memberCreatedListId,
        testName: "should add an item to own list, as Member",
      },
      {
        role: "Admin",
        accessToken: () => adminAccessToken,
        listId: () => memberCreatedListId,
        testName: "should add an item to Member's list, as Admin/assignee",
      },
      {
        role: "Member",
        accessToken: () => nonAdminAccessToken,
        listId: () => adminCreatedListId,
        testName: "should add an item to Admin's list, as Member/assignee",
      },
    ])("$testName", async ({ role, accessToken, listId }) => {
      const itemData = {
        content: "Test Item",
      };

      const response = await request(app)
        .post(`/groups/${groupId}/lists/${listId()}/items`)
        .send({ data: itemData })
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${accessToken()}`);

      // Store list item IDs for potential further tests
      if (listId() === adminCreatedListId) {
        adminCreatedListIdListItemIds.push(response.body.data.id);
      }

      if (listId() === memberCreatedListId) {
        memberCreatedListIdListItemIds.push(response.body.data.id);
      }

      console.log(`ADD ITEM TO LIST AS ${role}`, JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: expect.any(String),
        list_id: listId(),
        content: itemData.content,
        completed: false,
        created_at: expect.any(String),
        updated_at: null,
      });
    });
  });

  // GET LIST BY ID
  describe("Get List by ID", () => {
    test.each([
      {
        role: "Admin",
        accessToken: () => adminAccessToken,
        listId: () => adminCreatedListId,
        testName: "should retrieve a specific list by its ID, as Admin",
      },
      {
        role: "Member",
        accessToken: () => nonAdminAccessToken,
        listId: () => memberCreatedListId,
        testName: "should retrieve a specific list by its ID, as Member",
      },
      {
        role: "Admin",
        accessToken: () => adminAccessToken,
        listId: () => memberCreatedListId2,
        testName: "should retrieve Member's list by its ID, as Admin",
      },
    ])("$testName", async ({ role, accessToken, listId }) => {
      const response = await request(app)
        .get(`/groups/${groupId}/lists/${listId()}`)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${accessToken()}`);

      console.log(`GET LIST BY ID AS ${role}`, JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(listId());
    });
  });

  // UPDATE LIST
  describe("Update List", () => {
    test.each([
      {
        role: "Member",
        accessToken: () => nonAdminAccessToken,
        listId: () => adminCreatedListId,
        listType: "other",
        assignedTo: () => adminUserId,
        testName:
          "should update the list's title, list type and assign to Admin, as Member/assignee",
      },
      {
        role: "Admin",
        accessToken: () => adminAccessToken,
        listId: () => adminCreatedListId,
        listType: "todo",
        assignedTo: () => adminUserId,
        testName: "should update the list's title, list type and assign to self, as Admin",
      },
      {
        role: "Member",
        accessToken: () => nonAdminAccessToken,
        listId: () => memberCreatedListId,
        listType: "shopping",
        assignedTo: () => nonAdminUserId,
        testName: "should update the list's title, list type and assign to self, as Member",
      },
    ])("$testName", async ({ role, accessToken, listId, assignedTo }) => {
      const dueDate = new Date();
      dueDate.setUTCDate(dueDate.getUTCDate() + 14);
      dueDate.setUTCHours(0, 0, 0, 0);

      const updates = {
        title: "Updated List Title",
        listType: "todo",
        assignedTo: assignedTo(),
      };

      const response = await request(app)
        .patch(`/groups/${groupId}/lists/${listId()}`)
        .send({ data: updates })
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${accessToken()}`);

      console.log(`UPDATE LIST AS ${role}`, JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(listId());
      expect(response.body.data.title).toBe(updates.title);
      expect(response.body.data.list_type).toBe(updates.listType);
      expect(response.body.data.updated_at).toBeDefined();
      expect(response.body.data.assigned_to).toBe(assignedTo());
    });
  });

  // GET LIST ITEM BY ID
  describe("Get List Item by ID", () => {
    test.each([
      {
        role: "Member",
        accessToken: () => nonAdminAccessToken,
        listId: () => adminCreatedListId,
        listItemId: () => adminCreatedListIdListItemIds[0],
        testName: "should retrieve a specific list item by its ID, as Member",
      },
      {
        role: "Admin",
        accessToken: () => adminAccessToken,
        listId: () => memberCreatedListId,
        listItemId: () => memberCreatedListIdListItemIds[0],
        testName: "should retrieve a specific list item by its ID, as Admin",
      },
    ])("$testName", async ({ role, accessToken, listId, listItemId }) => {
      const response = await request(app)
        .get(`/groups/${groupId}/lists/${listId()}/items/${listItemId()}`)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${accessToken()}`);

      console.log(`GET LIST ITEM BY ID AS ${role}`, JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(listItemId());
      expect(response.body.data.list_id).toBe(listId());
    });
  });

  // UPDATE LIST ITEM
  describe("Update List Item", () => {
    test.each([
      {
        role: "Member",
        accessToken: () => nonAdminAccessToken,
        listId: () => memberCreatedListId,
        listItemId: () => memberCreatedListIdListItemIds[0],
        testName: "should update the list item content, as Member",
      },
      {
        role: "Admin",
        accessToken: () => adminAccessToken,
        listId: () => memberCreatedListId,
        listItemId: () => memberCreatedListIdListItemIds[0],
        testName: "should update the list item content, as Admin",
      },
    ])("$testName", async ({ role, accessToken, listId, listItemId }) => {
      const itemUpdates = {
        content: `${role} Updated Test Item Content`,
      };

      const response = await request(app)
        .patch(`/groups/${groupId}/lists/${listId()}/items/${listItemId()}`)
        .send({ data: itemUpdates })
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${accessToken()}`);

      console.log(`UPDATE LIST ITEM AS ${role}`, JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(listItemId());
      expect(response.body.data.content).toBe(itemUpdates.content);
    });
  });

  // TOGGLE COMPLETE STATUS OF LIST ITEM
  describe("Toggle Complete Status of List Item", () => {
    test.each([
      {
        role: "Member",
        accessToken: () => nonAdminAccessToken,
        listId: () => memberCreatedListId,
        listItemId: () => memberCreatedListIdListItemIds[0],
        testName: "should toggle complete status of list item 1, as Member",
      },
      {
        role: "Member",
        accessToken: () => nonAdminAccessToken,
        listId: () => memberCreatedListId,
        listItemId: () => memberCreatedListIdListItemIds[1],
        testName: "should toggle complete status of list item 2, as Member",
      },
      {
        role: "Admin",
        accessToken: () => adminAccessToken,
        listId: () => adminCreatedListId,
        listItemId: () => adminCreatedListIdListItemIds[0],
        testName: "should toggle complete status of list item 1, as Admin",
      },
      {
        role: "Admin",
        accessToken: () => adminAccessToken,
        listId: () => adminCreatedListId,
        listItemId: () => adminCreatedListIdListItemIds[1],
        testName: "should toggle complete status of list item 2, as Admin",
      },
    ])("$testName", async ({ role, accessToken, listId, listItemId }) => {
      const response = await request(app)
        .patch(`/groups/${groupId}/lists/${listId()}/items/${listItemId()}/toggle`)
        .send({ data: { completed: true } })
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${accessToken()}`);

      console.log(`TOGGLE COMPLETE STATUS AS ${role}`, JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.completed).toBe(true);
    });
  });

  // CHECK COMPLETED STATUS OF LIST AFTER COMPLETING ALL ITEMS IN LIST
  describe("Check Completed Status of List After Completing All Items", () => {
    test.each([
      {
        role: "Member",
        accessToken: () => nonAdminAccessToken,
        listId: () => memberCreatedListId,
        testName: "should mark the list as completed after all items are completed, as Member",
      },
      {
        role: "Admin",
        accessToken: () => adminAccessToken,
        listId: () => adminCreatedListId,
        testName: "should mark the list as completed after all items are completed, as Admin",
      },
    ])("$testName", async ({ role, accessToken, listId }) => {
      const response = await request(app)
        .get(`/groups/${groupId}/lists/${listId()}`)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${accessToken()}`);

      console.log(`CHECK LIST COMPLETED STATUS AS ${role}`, JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.completed).toBe(true);
      expect(response.body.data.completed_at).toBeDefined();
    });
  });

  // DELETE LIST ITEM
  describe("Delete List Item", () => {
    test.each([
      {
        role: "Member",
        accessToken: () => nonAdminAccessToken,
        listId: () => memberCreatedListId,
        listItemId: () => memberCreatedListIdListItemIds[0],
        testName: "should delete a list item, as Member",
      },
      {
        role: "Admin",
        accessToken: () => adminAccessToken,
        listId: () => adminCreatedListId,
        listItemId: () => adminCreatedListIdListItemIds[0],
        testName: "should delete a list item, as Admin",
      },
    ])("$testName", async ({ role, accessToken, listId, listItemId }) => {
      const response = await request(app)
        .delete(`/groups/${groupId}/lists/${listId()}/items/${listItemId()}`)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${accessToken()}`);

      console.log(`DELETE LIST ITEM AS ${role}`, JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(listItemId());
    });
  });

  // DELETE LIST
  describe("Delete List", () => {
    test.each([
      {
        role: "Admin",
        listId: () => adminCreatedListId,
        accessToken: () => adminAccessToken,
        testName: "should allow Admin to delete their own list",
      },
      {
        role: "Member",
        listId: () => memberCreatedListId,
        accessToken: () => nonAdminAccessToken,
        testName: "should allow Member to delete their own list",
      },
      {
        role: "Admin",
        listId: () => memberCreatedListId2,
        accessToken: () => adminAccessToken,
        testName: "should allow Admin to delete Member's list",
      },
    ])("$testName", async ({ role, listId, accessToken }) => {
      const response = await request(app)
        .delete(`/groups/${groupId}/lists/${listId()}`)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${accessToken()}`);

      console.log(`DELTE LIST AS ${role.toUpperCase()}`, JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(listId());
    });
  });
});
