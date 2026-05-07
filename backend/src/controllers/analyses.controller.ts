import { Request, Response } from "express";
import { db, analysesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

/**
 * Controller for historical analyses data.
 */
export class AnalysesController {
  /**
   * GET /api/analyses/trend/:username
   * Returns score trend sorted chronologically.
   */
  static async getTrend(req: Request, res: Response): Promise<void> {
    const username = (req.params.username as string)?.toLowerCase().trim();
    if (!username) {
      res.status(400).json({ 
        error: "validation_error", 
        message: "Username is required" 
      });
      return;
    }

    try {
      const rows = await db
        .select({
          score: analysesTable.score,
          analyzedAt: analysesTable.analyzedAt,
        })
        .from(analysesTable)
        .where(eq(analysesTable.username, username))
        .orderBy(asc(analysesTable.analyzedAt));

      const trend = rows.map((r: any) => ({
        date: r.analyzedAt 
          ? (r.analyzedAt instanceof Date ? r.analyzedAt : new Date(r.analyzedAt)).toISOString().split("T")[0] 
          : new Date().toISOString().split("T")[0],
        score: Number(r.score) || 0,
      }));

      res.json(trend);
    } catch (err) {
      req.log?.error({ err }, "Failed to fetch score trend");
      res.status(500).json({ 
        error: "internal_error", 
        message: "Failed to fetch score trend" 
      });
    }
  }
}
