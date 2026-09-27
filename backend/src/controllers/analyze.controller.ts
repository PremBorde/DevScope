import { Request, Response, NextFunction } from "express";
import { AnalyzeGithubUserParams } from "@workspace/api-zod";
import { analyzeUser } from "../services/analyze.service";

/**
 * Controller for GitHub profile analysis.
 */
export class AnalyzeController {
  /**
   * GET /api/analyze/:username
   */
  static async analyze(req: Request, res: Response, next: NextFunction): Promise<void> {
    const parseResult = AnalyzeGithubUserParams.safeParse(req.params);
    if (!parseResult.success) {
      res.status(400).json({ 
        error: "validation_error", 
        message: "Invalid username format" 
      });
      return;
    }

    const { username } = parseResult.data;
    const forceRefresh =
      req.query.fresh === "true" ||
      req.query.force === "true" ||
      req.query.live === "true" ||
      req.headers["cache-control"] === "no-cache";

    const token =
      (req.headers["x-github-token"] as string) ||
      (req.headers["authorization"]?.startsWith("Bearer ")
        ? req.headers["authorization"].slice(7)
        : undefined) ||
      (req.user as any)?.githubAccessToken;

    try {
      const result = await analyzeUser(username, { forceRefresh, token });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
