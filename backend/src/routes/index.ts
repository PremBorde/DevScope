import { Router, type IRouter } from "express";
import healthRouter from "./health";
import analyzeRouter from "./analyze";
import historyRouter from "./history";
import debugRouter from "./debug";
import authRouter from "./auth";
import roadmapRouter from "./roadmap";
import analysesRouter from "./analyses";
import aiRouter from "./ai";
import compareRouter from "./compare";
import reportRouter from "./report";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/analyze", analyzeRouter);
router.use("/compare", compareRouter);
router.use("/report", reportRouter);
router.use("/history", historyRouter);
router.use("/roadmap", roadmapRouter);
router.use("/analyses", analysesRouter);
router.use("/ai", aiRouter);
router.use("/debug-score", debugRouter);
router.use("/stats", async (req, res) => {
  res.redirect(307, "/api/history/stats/platform");
});

export default router;
