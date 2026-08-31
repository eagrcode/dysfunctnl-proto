const { Router } = require("express");
const {
  handleGetListsData,
  handleGetAlbumsData,
  handleGetTextChannelMessagesData,
  handleGetCalendarData,
} = require("./dashboard.controller");

const dashboardRouter = Router({ mergeParams: true });

dashboardRouter.get("/lists", handleGetListsData);
dashboardRouter.get("/albums", handleGetAlbumsData);
dashboardRouter.get("/messages", handleGetTextChannelMessagesData);
dashboardRouter.get("/calendar", handleGetCalendarData);

module.exports = dashboardRouter;
