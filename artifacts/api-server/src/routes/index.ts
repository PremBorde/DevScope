import { Router, type IRouter } from "express";
import healthRouter from "./health";
import analyzeRouter from "./analyze";
import historyRouter from "./history";
import debugRouter from "./debug";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/analyze", analyzeRouter);
router.use("/history", historyRouter);
router.use("/debug-score", debugRouter);
router.use("/stats", async (req, res) => {
  res.redirect(307, "/api/history/stats/platform");
});

export default router;
