import { Router, Request, Response } from "express";
import { analyzeUser, type AnalysisData } from "../services/analyze.service";
import { ai } from "@workspace/integrations-gemini-ai";
import { logger } from "../lib/logger";
import { redisGet, redisSet } from "../config/redis";

const COMPARE_CACHE_TTL = 900; // 15 minutes

function compareCacheKey(u1: string, u2: string): string {
  const [a, b] = [u1, u2].sort();
  return `compare:${a}:${b}`;
}

const router = Router();

type CategoryKey = "repoQuality" | "activityConsistency" | "techDiversity" | "popularity" | "completeness";

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  repoQuality:          "repo quality",
  activityConsistency:  "activity consistency",
  techDiversity:        "tech diversity",
  popularity:           "community popularity",
  completeness:         "profile completeness",
};

function getCategoryWinner(r1: AnalysisData, r2: AnalysisData, key: CategoryKey): "user1" | "user2" | "tie" {
  const v1 = r1.scoreBreakdown[key];
  const v2 = r2.scoreBreakdown[key];
  if (v1 > v2) return "user1";
  if (v2 > v1) return "user2";
  return "tie";
}

function buildBaseComparison(r1: AnalysisData, u1: string, r2: AnalysisData, u2: string) {
  const s1 = r1.scoreBreakdown.total;
  const s2 = r2.scoreBreakdown.total;
  const diff = Math.abs(s1 - s2);

  const categoryWinners = {
    repoQuality:          getCategoryWinner(r1, r2, "repoQuality"),
    activityConsistency:  getCategoryWinner(r1, r2, "activityConsistency"),
    techDiversity:        getCategoryWinner(r1, r2, "techDiversity"),
    popularity:           getCategoryWinner(r1, r2, "popularity"),
    completeness:         getCategoryWinner(r1, r2, "completeness"),
  };

  const user1CatWins = Object.values(categoryWinners).filter(w => w === "user1").length;
  const user2CatWins = Object.values(categoryWinners).filter(w => w === "user2").length;

  let winner: "user1" | "user2" | "tie";
  let winnerUsername: string;

  if (diff < 3) {
    winner = "tie";
    winnerUsername = user1CatWins >= user2CatWins ? u1 : u2;
  } else if (s1 > s2) {
    winner = "user1";
    winnerUsername = u1;
  } else {
    winner = "user2";
    winnerUsername = u2;
  }

  const winnerCatKeys = Object.entries(categoryWinners)
    .filter(([, w]) => w === winner)
    .map(([k]) => CATEGORY_LABELS[k as CategoryKey]);

  let reason: string;
  if (winner === "tie") {
    reason = `@${u1} (${s1}/100) and @${u2} (${s2}/100) are closely matched. @${u1} leads ${user1CatWins} categories, @${u2} leads ${user2CatWins}.`;
  } else {
    const loser = winner === "user1" ? u2 : u1;
    const winScore = winner === "user1" ? s1 : s2;
    const loseScore = winner === "user1" ? s2 : s1;
    const edges = winnerCatKeys.slice(0, 2).join(" and ") || "overall scoring";
    reason = `@${winnerUsername} is the stronger candidate (${winScore}/100 vs ${loseScore}/100), with clear advantages in ${edges}. @${loser} rated "${(winner === "user1" ? r2 : r1).aiInsights.hiringRecommendation.replace("_", " ")}".`;
  }

  return { winner, winnerUsername, reason, scoreDiff: diff, categoryWinners };
}

async function generateAiVerdict(
  r1: AnalysisData, u1: string,
  r2: AnalysisData, u2: string,
  fallback: string
): Promise<string> {
  const prompt = `You are a brutally honest senior technical recruiter making a real hiring decision. Compare these two GitHub developers and give a hiring verdict in exactly 2-3 sentences. Be specific, reference actual numbers, and name the winner clearly.

@${u1}: Score ${r1.scoreBreakdown.total}/100
- Repos: ${r1.repoStats.totalRepos} | Stars: ${r1.repoStats.totalStars} | Forks: ${r1.repoStats.totalForks}
- Top languages: ${r1.repoStats.topLanguages.slice(0, 3).join(", ") || "None"}
- Hiring recommendation: ${r1.aiInsights.hiringRecommendation.replace(/_/g, " ")}
- Summary: ${r1.aiInsights.summary}

@${u2}: Score ${r2.scoreBreakdown.total}/100
- Repos: ${r2.repoStats.totalRepos} | Stars: ${r2.repoStats.totalStars} | Forks: ${r2.repoStats.totalForks}
- Top languages: ${r2.repoStats.topLanguages.slice(0, 3).join(", ") || "None"}
- Hiring recommendation: ${r2.aiInsights.hiringRecommendation.replace(/_/g, " ")}
- Summary: ${r2.aiInsights.summary}

Return only the verdict text. No headers, no JSON, no markdown.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    const text = response.text?.trim();
    if (text && text.length > 20) return text;
    return fallback;
  } catch (err) {
    logger.warn({ err }, "Gemini compare verdict failed — using fallback");
    return fallback;
  }
}

router.get("/", async (req: Request, res: Response) => {
  const user1 = String(req.query.user1 ?? "").trim().toLowerCase();
  const user2 = String(req.query.user2 ?? "").trim().toLowerCase();

  if (!user1 || !user2) {
    res.status(400).json({ error: "validation_error", message: "user1 and user2 query params are required" });
    return;
  }
  if (user1 === user2) {
    res.status(400).json({ error: "validation_error", message: "user1 and user2 must be different usernames" });
    return;
  }

  try {
    // Check compare-level cache (covers both orderings via sorted key)
    const cacheKey = compareCacheKey(user1, user2);
    const cached = await redisGet(cacheKey);
    if (cached) {
      logger.info({ user1, user2, cacheKey }, "[COMPARE CACHE HIT] Returning cached comparison");
      res.json(JSON.parse(cached));
      return;
    }

    const [result1, result2] = await Promise.all([
      analyzeUser(user1),
      analyzeUser(user2),
    ]);

    const base = buildBaseComparison(result1, user1, result2, user2);
    const reason = await generateAiVerdict(result1, user1, result2, user2, base.reason);
    const comparison = { ...base, reason };

    const responseBody = { user1: result1, user2: result2, comparison };

    // Cache the full compare result
    await redisSet(cacheKey, JSON.stringify(responseBody), COMPARE_CACHE_TTL);
    logger.info({ user1, user2, cacheKey, ttl: COMPARE_CACHE_TTL }, "[COMPARE CACHE SET] Cached comparison result");

    res.json(responseBody);
  } catch (err: unknown) {
    const apiErr = err as { status?: number; message?: string };
    if (apiErr.status === 404) {
      res.status(404).json({ error: "not_found", message: apiErr.message ?? "User not found" });
    } else if (apiErr.status === 429) {
      res.status(429).json({ error: "rate_limit", message: apiErr.message ?? "Rate limit exceeded" });
    } else {
      req.log?.error({ err }, "Failed to compare GitHub users");
      res.status(500).json({ error: "internal_error", message: "Failed to compare profiles. Please try again." });
    }
  }
});

export default router;
