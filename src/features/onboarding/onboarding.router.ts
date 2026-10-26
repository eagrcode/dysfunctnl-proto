import { Router } from "express";
import { handleRedeemCode, handleCompleteOnboarding } from "./onboarding.controller";

const onboardingRouter = Router();

onboardingRouter.post("/join-group", handleRedeemCode);
onboardingRouter.post("/complete-onboarding", handleCompleteOnboarding);

export { onboardingRouter };
