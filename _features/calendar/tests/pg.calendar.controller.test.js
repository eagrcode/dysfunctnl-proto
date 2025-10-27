const request = require("supertest");
const app = require("../../../app");
const dotenv = require("dotenv");
const {
  createGroup,
  loginUser,
  registerUser,
  addMember,
} = require("../../../_shared/helpers/testSetup");

dotenv.config();

const TEST_EMAIL = process.env.TEST_USER_1;

describe("Calendar API Integration Tests - Authorised Actions", () => {
  let adminAccessToken;
  let adminUserId;
  let groupId;
  let memberId;
  let memberAccessToken;
  let eventId;
  let eventData;

  const groupData = {
    name: "Test Group",
    description: "Test description",
  };

  // Initial setup
  beforeAll(async () => {
    const { user, accessToken } = await loginUser(TEST_EMAIL);
    adminUserId = user.id;
    adminAccessToken = accessToken;

    groupId = await createGroup(groupData, adminAccessToken);

    const { email: naEmail, userId: naUserId } = await registerUser();
    memberId = naUserId;

    memberAccessToken = (await loginUser(naEmail)).accessToken;

    const { success, role } = await addMember(
      groupId,
      memberId,
      adminAccessToken
    );
    expect(success).toBe(true);
    expect(role.is_admin).toBe(false);
  });

  // Cleanup: Delete the created group
  afterAll(async () => {
    if (groupId) {
      console.log("CLEANUP: Deleting test group with ID:", groupId);

      await request(app)
        .delete(`/groups/${groupId}`)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${adminAccessToken}`);
    }
  });

  // CREATE EVENT
  describe("Create Calendar Event", () => {
    test.each([
      {
        role: "Admin",
        userId: () => adminUserId,
        accessToken: () => adminAccessToken,
      },
      {
        role: "Member",
        userId: () => memberId,
        accessToken: () => memberAccessToken,
      },
    ])(
      "Should allow $role to create a calandar event",
      async ({ role, userId, accessToken }) => {
        const eventData = {
          createdBy: userId(),
          title: "Family Meetup",
          description: "Annual family gathering",
          startTime: "2024-12-20T10:00:00.000Z",
          endTime: "2024-12-20T18:00:00.000Z",
          allDay: false,
          participants: [userId()],
          location: "My House",
        };

        const response = await request(app)
          .post(`/groups/${groupId}/calendar`)
          .send(eventData)
          .set("Content-Type", "application/json")
          .set("Authorization", `Bearer ${accessToken()}`);

        console.log(
          `CREATE EVENT RESPONSE: ${role}`,
          JSON.stringify(response.body, null, 2)
        );

        eventId = response.body.data.id;

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          id: expect.any(String),
          group_id: groupId,
          created_by: eventData.createdBy,
          title: eventData.title,
          description: eventData.description,
          start_time: eventData.startTime,
          end_time: eventData.endTime,
          all_day: eventData.allDay,
          participants: eventData.participants,
          location: eventData.location,
        });
      }
    );

    // Missing required fields test
    describe("Create Calendar Event - Missing Data", () => {
      test.each([
        {
          role: "Admin",
          accessToken: () => adminAccessToken,
        },
        {
          role: "Member",
          accessToken: () => memberAccessToken,
        },
      ])(
        "Should fail to create calendar event with missing data as $role",
        async ({ role, accessToken }) => {
          const invalidEventData = {
            createdBy: "",
            title: "",
            startTime: "",
            endTime: "",
          };

          const response = await request(app)
            .post(`/groups/${groupId}/calendar`)
            .send(invalidEventData)
            .set("Content-Type", "application/json")
            .set("Authorization", `Bearer ${accessToken()}`);

          console.log(
            `CREATE EVENT with missing data RESPONSE: ${role}`,
            JSON.stringify(response.body, null, 2)
          );

          expect(response.status).toBe(400);
          expect(response.body.errors).toBeDefined();
        }
      );
    });

    // Invalid URL test
    describe("Create Calendar Event - Invalid URL", () => {
      test("Should fail to create calendar event with invalid URL", async () => {
        const eventData = {
          createdBy: adminUserId,
          title: "Ladz Sesh",
          description: "Lets get wonky",
          startTime: "2024-11-15T09:00:00.000Z",
          endTime: "2024-11-15T17:00:00.000Z",
          allDay: false,
          participants: [adminUserId],
          location: "Park",
        };

        const response = await request(app)
          .post(`/groups/${groupId}/calendarr`) // Invalid endpoint
          .send(eventData)
          .set("Content-Type", "application/json")
          .set("Authorization", `Bearer ${adminAccessToken}`);

        console.log(
          "CREATE EVENT with invalid URL RESPONSE:",
          JSON.stringify(response.body, null, 2)
        );

        expect(response.status).toBe(404);
      });
    });
  });

  // GET EVENT BY ID
  describe("Get Calendar Event by ID", () => {
    test.each([
      {
        role: "Admin",
        accessToken: () => adminAccessToken,
      },
      {
        role: "Member",
        accessToken: () => memberAccessToken,
      },
    ])(
      "Should allow $role to get calendar event by ID",
      async ({ role, accessToken }) => {
        const response = await request(app)
          .get(`/groups/${groupId}/calendar/${eventId}`)
          .set("Content-Type", "application/json")
          .set("Authorization", `Bearer ${accessToken()}`);

        console.log(
          `GET EVENT BY ID RESPONSE: ${role}`,
          JSON.stringify(response.body, null, 2)
        );

        eventData = response.body.data;

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject(eventData);
      }
    );
  });

  // UPDATE EVENT
  describe("Update Calendar Event", () => {
    test("Should allow event creator to update calendar event", async () => {
      const updatedEventData = {
        startTime: "2024-12-20T11:00:00.000Z",
        endTime: "2024-12-20T19:00:00.000Z",
        participants: [adminUserId, memberId],
        location: "New Location",
      };

      const response = await request(app)
        .patch(`/groups/${groupId}/calendar/${eventId}`)
        .send(updatedEventData)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${memberAccessToken}`);

      console.log(
        `UPDATE EVENT RESPONSE`,
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.updated_at).toBeDefined();
      expect(response.body.data).toMatchObject({
        id: eventId,
        group_id: groupId,
        start_time: updatedEventData.startTime,
        end_time: updatedEventData.endTime,
        participants: updatedEventData.participants,
        location: updatedEventData.location,
      });
    });
  });

  // GET EVENTS BY RANGE
  describe("Get Calendar Events by Range", () => {
    test.each([
      {
        role: "Admin",
        accessToken: () => adminAccessToken,
      },
      {
        role: "Member",
        accessToken: () => memberAccessToken,
      },
    ])(
      "Should allow $role to get calendar events by range",
      async ({ role, accessToken }) => {
        const start = "2024-12-01T00:00:00.000Z";
        const end = "2024-12-31T23:59:59.999Z";

        const response = await request(app)
          .get(
            `/groups/${groupId}/calendar/range?start=${encodeURIComponent(
              start
            )}&end=${encodeURIComponent(end)}`
          )
          .set("Content-Type", "application/json")
          .set("Authorization", `Bearer ${accessToken()}`);

        console.log(
          `GET EVENTS BY RANGE RESPONSE: ${role}`,
          JSON.stringify(response.body, null, 2)
        );

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);

        if (response.body.data.length > 0) {
          const eventStartTimes = response.body.data.map((e) => e.start_time);
          const eventEndTimes = response.body.data.map((e) => e.end_time);

          eventStartTimes.forEach((time) => {
            expect(new Date(time) < new Date(end)).toBe(true);
          });
          eventEndTimes.forEach((time) => {
            expect(new Date(time) > new Date(start)).toBe(true);
          });
        }
      }
    );
  });

  // DELETE EVENT
  describe("Delete Calendar Event", () => {
    test("Should allow event creator to delete calendar event", async () => {
      const response = await request(app)
        .delete(`/groups/${groupId}/calendar/${eventId}`)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${memberAccessToken}`);

      console.log(
        `DELETE EVENT RESPONSE`,
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(eventId);
    });
  });
});
