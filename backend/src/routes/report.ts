/**
 * /api/report routes — read-only DB snapshots for public sharing.
 *
 * GET /report/:username    → latest saved analysis for a username
 * GET /report/view/:id     → exact snapshot by numeric analysis ID
 *
 * Neither endpoint re-fetches GitHub or calls AI — pure DB reads.
 */

import { Router, Request, Response, NextFunction } from "express";
import { db, analysesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { AppError } from "../lib/errors";
import { validateUsername } from "../middleware/validate-username";

const router = Router();

function rowToResult(row: typeof analysesTable.$inferSelect) {
  return {
    id: row.id,
    username: row.username,
    profile: row.profileJson,
    repoStats: row.repoStatsJson,
    languageDistribution: row.languageDistributionJson,
    scoreBreakdown: row.scoreBreakdownJson,
    aiInsights: row.aiInsightsJson,
    analyzedAt: row.analyzedAt instanceof Date 
      ? row.analyzedAt.toISOString() 
      : new Date(row.analyzedAt).toISOString(),
    cached: true,
    cacheSource: "db",
  };
}

// GET /report/view/:id — must be declared BEFORE /:username
router.get("/view/:id", async (req: Request, res: Response, next: NextFunction) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id) || id <= 0) {
    return next(new AppError(400, "validation_error", "Report ID must be a positive integer"));
  }

  try {
    const [row] = await db
      .select()
      .from(analysesTable)
      .where(eq(analysesTable.id, id))
      .limit(1);

    if (!row) {
      return next(new AppError(404, "not_found", `No report found with id ${id}`));
    }

    res.json(rowToResult(row));
  } catch (err) {
    next(err);
  }
});

// GET /report/:username — latest analysis for this username
router.get(
  "/:username",
  validateUsername(),
  async (req: Request, res: Response, next: NextFunction) => {
    const username = req.params.username as string;

    try {
      const [row] = await db
        .select()
        .from(analysesTable)
        .where(eq(analysesTable.username, username))
        .orderBy(desc(analysesTable.analyzedAt))
        .limit(1);

      if (!row) {
        return next(
          new AppError(
            404,
            "not_found",
            `No report found for @${username}. Run an analysis first.`,
          ),
        );
      }

      res.json(rowToResult(row));
    } catch (err) {
      next(err);
    }
  },
);

export default router;
