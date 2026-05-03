import { Router, type IRouter } from "express";
import healthRouter from "./health";
import analyzeRouter from "./analyze";
import historyRouter from "./history";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/analyze", analyzeRouter);
router.use("/history", historyRouter);
router.use("/stats", async (req, res) => {
  res.redirect(307, "/api/history/stats/platform");
});

export default router;
