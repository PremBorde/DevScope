/**
 * /api/report routes — read-only DB snapshots for public sharing.
 *
 * GET /report/:username    → latest saved analysis for a username
 * GET /report/view/:id     → exact snapshot by numeric analysis ID
 *
 * Neither endpoint re-fetches GitHub or calls AI — pure DB reads.
 */

import { Router, Request, Response } from "express";
import { db, analysesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

/** Reconstruct the same AnalysisResult shape the /analyze endpoint returns. */
function rowToResult(row: typeof analysesTable.$inferSelect) {
  return {
    id: row.id,
    username: row.username,
    profile: row.profileJson,
    repoStats: row.repoStatsJson,
    languageDistribution: row.languageDistributionJson,
    scoreBreakdown: row.scoreBreakdownJson,
    aiInsights: row.aiInsightsJson,
    analyzedAt: row.analyzedAt.toISOString(),
    cached: true,
    cacheSource: "db",
  };
}

// GET /report/view/:id  — must be declared BEFORE /:username so "view" isn't
// consumed as a username parameter.
router.get("/view/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id) || id <= 0) {
    res.status(400).json({ error: "validation_error", message: "Invalid report ID" });
    return;
  }

  try {
    const [row] = await db
      .select()
      .from(analysesTable)
      .where(eq(analysesTable.id, id))
      .limit(1);

    if (!row) {
      res.status(404).json({ error: "not_found", message: `No report found with id ${id}` });
      return;
    }

    res.json(rowToResult(row));
  } catch (err) {
    req.log?.error({ err }, "Failed to fetch report by id");
    res.status(500).json({ error: "internal_error", message: "Failed to fetch report" });
  }
});

// GET /report/:username  — latest analysis for this username
router.get("/:username", async (req: Request, res: Response) => {
  const username = (req.params.username as string)?.toLowerCase().trim();
  if (!username) {
    res.status(400).json({ error: "validation_error", message: "Username is required" });
    return;
  }

  try {
    const [row] = await db
      .select()
      .from(analysesTable)
      .where(eq(analysesTable.username, username))
      .orderBy(desc(analysesTable.analyzedAt))
      .limit(1);

    if (!row) {
      res.status(404).json({
        error: "not_found",
        message: `No report found for @${username}. Run an analysis first.`,
      });
      return;
    }

    res.json(rowToResult(row));
  } catch (err) {
    req.log?.error({ err }, "Failed to fetch report by username");
    res.status(500).json({ error: "internal_error", message: "Failed to fetch report" });
  }
});

export default router;
