import { Router } from "express";
import { AnalysesController } from "../controllers/analyses.controller";

const router = Router();

// GET /trend/:username
router.get("/trend/:username", AnalysesController.getTrend);

export default router;
