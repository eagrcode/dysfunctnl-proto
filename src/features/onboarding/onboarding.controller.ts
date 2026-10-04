import { body, validationResult } from "express-validator";
import { logger } from "../../lib/logger";
import { UnauthorisedError, ValidationError } from "../../lib/errors";
import { redeemCode } from "./onboarding.model";
import type { Request, Response } from "express";

type ReqWithUser = Request & {
  user?: {
    id: string;
  };
};

const validateJoinGroup = [
  body("code").isString().notEmpty(),
  body("code").isLength({ min: 6, max: 6 }),
];

const handleRedeemCode = [
  ...validateJoinGroup,

  async (req: ReqWithUser, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError("Validation failed", errors.array());
    }

    if (!req.user) {
      throw new UnauthorisedError("User not authenticated");
    }

    const { id: userId } = req.user;
    const { code } = req.body;

    const result = await redeemCode(userId, code);

    // Handle joining a group
    res.status(200).json(result);
  },
];

export { handleRedeemCode };
