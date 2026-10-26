import { getOverviewLists } from "./overview.model";
import { UnauthorisedError, ValidationError } from "../../lib/errors";
import { param, validationResult } from "express-validator";
import type { Request, Response } from "express";

type ReqWithUser = Request & {
  user?: {
    id: string;
  };
};

const handleGetOverviewLists = async (req: ReqWithUser, res: Response) => {
  if (!req.user) {
    throw new UnauthorisedError("User not authenticated");
  }

  const { id: userId } = req.user;

  try {
    const overviewLists = await getOverviewLists(userId);

    res.json(overviewLists);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch overview lists" });
  }
};

export { handleGetOverviewLists };
