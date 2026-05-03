import { Router, Request, Response } from "express";
import { AnalyzeGithubUserParams } from "@workspace/api-zod";
import { analyzeUser } from "../services/analyze.service";

const router = Router();

router.get("/:username", async (req: Request, res: Response) => {
  const parseResult = AnalyzeGithubUserParams.safeParse(req.params);
  if (!parseResult.success) {
    res.status(400).json({ error: "validation_error", message: "Invalid username" });
    return;
  }

  const { username } = parseResult.data;

  try {
    const result = await analyzeUser(username);
    res.json(result);
  } catch (err: unknown) {
    const apiErr = err as { status?: number; message?: string };
    if (apiErr.status === 404) {
      res.status(404).json({ error: "not_found", message: apiErr.message ?? "User not found" });
    } else if (apiErr.status === 429) {
      res.status(429).json({ error: "rate_limit", message: apiErr.message ?? "Rate limit exceeded" });
    } else {
      req.log?.error({ err }, "Failed to analyze GitHub user");
      res.status(500).json({ error: "internal_error", message: "Failed to analyze profile. Please try again." });
    }
  }
});

export default router;
