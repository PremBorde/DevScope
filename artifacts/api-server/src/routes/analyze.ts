import { Router, Request, Response, NextFunction } from "express";
import { AnalyzeGithubUserParams } from "@workspace/api-zod";
import { analyzeUser } from "../services/analyze.service";
import { validateUsername } from "../middleware/validate-username";
import { analyzeLimiter } from "../middleware/rate-limit";

const router = Router();

router.get(
  "/:username",
  analyzeLimiter,
  validateUsername(),
  async (req: Request, res: Response, next: NextFunction) => {
    const parseResult = AnalyzeGithubUserParams.safeParse(req.params);
    if (!parseResult.success) {
      res.status(400).json({ error: "validation_error", message: "Invalid username" });
      return;
    }

    const { username } = parseResult.data;

    try {
      const result = await analyzeUser(username);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
