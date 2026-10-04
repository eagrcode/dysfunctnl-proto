import { Router } from "express";
import { handleRedeemCode } from "./onboarding.controller";

const onboardingRouter = Router();

onboardingRouter.post("/join-group", handleRedeemCode);

export { onboardingRouter };
