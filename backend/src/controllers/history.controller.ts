import { Request, Response, NextFunction } from "express";
import {
  GetAnalysisHistoryQueryParams,
  GetUserAnalysisHistoryParams,
} from "@workspace/api-zod";
import { db, analysesTable } from "@workspace/db";
import { desc, eq, sql } from "drizzle-orm";

/**
 * Controller for platform analysis history and statistics.
 */
export class HistoryController {
  /**
   * GET /api/history
   */
  static async getGlobalHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    const parseResult = GetAnalysisHistoryQueryParams.safeParse(req.query);
    const limit = parseResult.success ? (parseResult.data.limit ?? 10) : 10;

    try {
      const rows = await db
        .select({
          id: analysesTable.id,
          username: analysesTable.username,
          score: analysesTable.score,
          hiringRecommendation: analysesTable.hiringRecommendation,
          avatarUrl: analysesTable.avatarUrl,
          topLanguages: analysesTable.topLanguages,
          analyzedAt: analysesTable.analyzedAt,
        })
        .from(analysesTable)
        .orderBy(desc(analysesTable.analyzedAt))
        .limit(limit);

      res.json(
        rows.map((r) => ({
          id: r.id,
          username: r.username,
          score: Number(r.score) || 0,
          hiringRecommendation: r.hiringRecommendation,
          avatarUrl: r.avatarUrl,
          topLanguages: r.topLanguages,
          analyzedAt: r.analyzedAt instanceof Date ? r.analyzedAt.toISOString() : new Date(r.analyzedAt).toISOString(),
        })),
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/history/:username
   */
  static async getUserHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    const parseResult = GetUserAnalysisHistoryParams.safeParse(req.params);
    if (!parseResult.success) {
      res.status(400).json({ error: "validation_error", message: "Invalid username" });
      return;
    }

    const { username } = parseResult.data;

    try {
      const rows = await db
        .select({
          id: analysesTable.id,
          username: analysesTable.username,
          score: analysesTable.score,
          hiringRecommendation: analysesTable.hiringRecommendation,
          avatarUrl: analysesTable.avatarUrl,
          topLanguages: analysesTable.topLanguages,
          analyzedAt: analysesTable.analyzedAt,
        })
        .from(analysesTable)
        .where(eq(analysesTable.username, username))
        .orderBy(desc(analysesTable.analyzedAt));

      res.json(
        rows.map((r) => ({
          id: r.id,
          username: r.username,
          score: Number(r.score) || 0,
          hiringRecommendation: r.hiringRecommendation,
          avatarUrl: r.avatarUrl,
          topLanguages: r.topLanguages,
          analyzedAt: r.analyzedAt instanceof Date ? r.analyzedAt.toISOString() : new Date(r.analyzedAt).toISOString(),
        })),
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/history/stats/platform
   */
  static async getPlatformStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const [statsRow] = await db
        .select({
          totalAnalyses: sql<number>`count(*)::int`,
          uniqueUsers: sql<number>`count(distinct ${analysesTable.username})::int`,
          avgScore: sql<number>`avg(${analysesTable.score}::numeric)::float`,
        })
        .from(analysesTable);

      const allRows = await db
        .select({
          topLanguages: analysesTable.topLanguages,
          hiringRecommendation: analysesTable.hiringRecommendation,
        })
        .from(analysesTable);

      const langCounts: Record<string, number> = {};
      const hiringCounts = { strong_hire: 0, hire: 0, consider: 0, pass: 0 };

      for (const row of allRows) {
        for (const lang of row.topLanguages ?? []) {
          langCounts[lang] = (langCounts[lang] ?? 0) + 1;
        }
        const rec = row.hiringRecommendation as keyof typeof hiringCounts;
        if (rec in hiringCounts) hiringCounts[rec]++;
      }

      const topLanguages = Object.entries(langCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([lang]) => lang);

      res.json({
        totalAnalyses: statsRow?.totalAnalyses ?? 0,
        uniqueUsers: statsRow?.uniqueUsers ?? 0,
        avgScore: Math.round((statsRow?.avgScore ?? 0) * 10) / 10,
        topLanguages,
        hiringBreakdown: hiringCounts,
      });
    } catch (err) {
      next(err);
    }
  }
}
