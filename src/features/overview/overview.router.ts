import { Router } from "express";
import { handleGetOverviewLists } from "./overview.controller";

const overviewRouter = Router();

overviewRouter.get("/lists", handleGetOverviewLists);

export { overviewRouter };
