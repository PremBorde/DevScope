import { Router } from "express";
import { AnalyzeController } from "../controllers/analyze.controller";
import { validateUsername } from "../middleware/validate-username";
import { analyzeLimiter } from "../middleware/rate-limit";

const router = Router();

router.get(
  "/:username",
  analyzeLimiter,
  validateUsername(),
  AnalyzeController.analyze
);

export default router;
