import { Router } from "express";
import { HistoryController } from "../controllers/history.controller";
import { validateUsername } from "../middleware/validate-username";

const router = Router();

// GET /api/history
router.get("/", HistoryController.getGlobalHistory);

// GET /api/history/stats/platform
router.get("/stats/platform", HistoryController.getPlatformStats);

// GET /api/history/:username
router.get("/:username", validateUsername(), HistoryController.getUserHistory);

export default router;
