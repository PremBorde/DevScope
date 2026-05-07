/**
 * Shared GitHub analysis service.
 * Used by both the /analyze and /compare routes.
 *
 * Perf features:
 *  - In-flight deduplication: concurrent requests for the same username share one promise
 *  - Layered cache: Redis → in-memory Map → GitHub API + Gemini AI
 */

import { db, analysesTable } from "@workspace/db";
import { ai } from "@workspace/integrations-gemini-ai";
import { calculateScore, type ScoredUser, type ScoredRepo } from "./scoring.service";
import { getCached, setCached } from "./github-cache.service";
import { logger } from "../lib/logger";
import { AppError } from "../lib/errors";

export interface GithubUser extends ScoredUser {
  message?: string;
}

export type GithubRepo = ScoredRepo;

export interface AiInsights {
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  hiringRecommendation: string;
  summary: string;
}

export interface RepoStats {
  totalRepos: number;
  totalStars: number;
  totalForks: number;
  avgStarsPerRepo: number;
  reposWithReadme: number;
  reposWithDescription: number;
  mostStarredRepo: string | null;
  topLanguages: string[];
}

export interface AnalysisData {
  id?: number;
  username: string;
  profile: GithubUser;
  repoStats: RepoStats;
  languageDistribution: Record<string, number>;
  scoreBreakdown: {
    repoQuality: number;
    activityConsistency: number;
    techDiversity: number;
    popularity: number;
    completeness: number;
    total: number;
  };
  aiInsights: AiInsights;
  analyzedAt: string;
  cached: boolean;
  cacheSource: string | null;
}

// ── In-flight deduplication ──────────────────────────────────────────────────
// Prevents duplicate GitHub API + Gemini calls when multiple users request the
// same username simultaneously before the first result is cached.
const inFlight = new Map<string, Promise<AnalysisData>>();

// ── GitHub fetch helpers ─────────────────────────────────────────────────────

export async function fetchGitHubUser(username: string): Promise<GithubUser> {
  let res: Response;
  try {
    const headers: Record<string, string> = { Accept: "application/vnd.github.v3+json" };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
    }

    res = await fetch(`https://api.github.com/users/${username}`, {
      headers,
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    logger.warn({ err, username }, "GitHub API network error");
    throw new AppError(502, "github_api_error", "Could not reach GitHub API. Please try again.");
  }

  if (res.status === 404) {
    throw new AppError(404, "github_not_found", `GitHub user '${username}' not found`);
  }
  if (res.status === 429 || res.status === 403) {
    throw new AppError(429, "github_rate_limit", "GitHub API rate limit exceeded. Please try again in a few minutes.");
  }
  if (!res.ok) {
    throw new AppError(502, "github_api_error", `GitHub API returned an error (HTTP ${res.status}). Try again shortly.`);
  }
  return res.json() as Promise<GithubUser>;
}

export async function fetchGitHubRepos(username: string): Promise<GithubRepo[]> {
  try {
    const headers: Record<string, string> = { Accept: "application/vnd.github.v3+json" };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
    }

    const res = await fetch(
      `https://api.github.com/users/${username}/repos?per_page=100&sort=updated&type=owner`,
      {
        headers,
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!res.ok) return [];
    const repos = (await res.json()) as GithubRepo[];
    return repos.filter((r) => !r.fork);
  } catch {
    logger.warn({ username }, "Failed to fetch GitHub repos — continuing with empty list");
    return [];
  }
}

export function computeLanguageDistribution(repos: GithubRepo[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const repo of repos) {
    if (repo.language) counts[repo.language] = (counts[repo.language] ?? 0) + 1;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return {};
  return Object.fromEntries(
    Object.entries(counts).map(([k, v]) => [k, Math.round((v / total) * 1000) / 10]),
  );
}

export async function generateAiInsights(
  user: GithubUser,
  repoStats: RepoStats,
  scoreResult: ReturnType<typeof calculateScore>,
  languageDist: Record<string, number>,
): Promise<AiInsights> {
  const { flat: scoreBreakdown, breakdown, meta } = scoreResult;

  const prompt = `You are a senior technical recruiter analyzing a GitHub profile. Provide a structured assessment.

GitHub Profile:
- Username: ${user.login}
- Name: ${user.name ?? "Not set"}
- Bio: ${user.bio ?? "Not set"}
- Account age: since ${user.created_at.split("T")[0]} (${meta.accountAgeYears} years)
- Public repos: ${user.public_repos} (${meta.ownedRepos} owned, non-fork)
- Followers: ${user.followers}
- Total stars: ${meta.totalStars}
- Total forks: ${meta.totalForks}
- Most starred repo: ${repoStats.mostStarredRepo ?? "None"}
- Languages: ${Object.keys(languageDist).join(", ") || "None"}
- Days since last commit: ${meta.daysSinceLastCommit}
- Active repo ratio (12mo): ${meta.activeRepoRatio}%
- README/description coverage: ${meta.readmeCoverage}%

Deterministic Score: ${scoreBreakdown.total}/100
- Repo Quality: ${scoreBreakdown.repoQuality}/30 — ${breakdown.repoQuality.reason}
- Activity: ${scoreBreakdown.activityConsistency}/25 — ${breakdown.activity.reason}
- Tech Diversity: ${scoreBreakdown.techDiversity}/20 — ${breakdown.diversity.reason}
- Popularity: ${scoreBreakdown.popularity}/15 — ${breakdown.popularity.reason}
- Completeness: ${scoreBreakdown.completeness}/10 — ${breakdown.completeness.reason}

Return ONLY a JSON object:
{
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
  "hiringRecommendation": "strong_hire" | "hire" | "consider" | "pass",
  "summary": "2-3 sentence executive summary referencing specific data points"
}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 8192, responseMimeType: "application/json" },
    });
    const parsed = JSON.parse(response.text ?? "{}");
    return {
      strengths: parsed.strengths ?? [],
      weaknesses: parsed.weaknesses ?? [],
      suggestions: parsed.suggestions ?? [],
      hiringRecommendation: parsed.hiringRecommendation ?? "consider",
      summary: parsed.summary ?? "No summary available.",
    };
  } catch (err) {
    logger.warn({ err, username: user.login }, "Gemini AI insights failed — using deterministic fallback");
    const score = scoreBreakdown.total;
    return {
      strengths: [
        meta.activeRepoRatio > 60
          ? `Actively maintains ${meta.activeRepoRatio}% of repos in the last year`
          : "Has established GitHub presence",
        repoStats.topLanguages.length > 2
          ? `Proficient in multiple technologies: ${repoStats.topLanguages.slice(0, 3).join(", ")}`
          : "Focused technical skillset",
        meta.totalStars > 10
          ? `${meta.totalStars} community stars show recognised work`
          : "Building a public portfolio",
      ],
      weaknesses: [
        scoreBreakdown.completeness < 6
          ? "Profile completeness needs improvement (bio, descriptions)"
          : "Could improve repo documentation coverage",
        meta.daysSinceLastCommit > 90
          ? `No GitHub activity in ${meta.daysSinceLastCommit} days`
          : "Limited community engagement (forks/stars)",
      ],
      suggestions: [
        "Add detailed README files to key repositories",
        "Contribute to popular open-source projects to build recognition",
        "Showcase projects with live demos and documentation",
      ],
      hiringRecommendation: score >= 70 ? "hire" : score >= 50 ? "consider" : "pass",
      summary: `Developer scored ${score}/100. Has ${meta.ownedRepos} owned repos across ${meta.distinctLanguages} language(s), last active ${meta.daysSinceLastCommit} days ago. ${breakdown.repoQuality.reason}.`,
    };
  }
}

// ── Core analysis function ───────────────────────────────────────────────────

async function _runAnalysis(username: string): Promise<AnalysisData> {
  const [user, repos] = await Promise.all([
    fetchGitHubUser(username),
    fetchGitHubRepos(username),
  ]);

  const languageDistribution = computeLanguageDistribution(repos);
  const scoreResult = calculateScore(user, repos, languageDistribution);
  const { flat: scoreBreakdown, meta } = scoreResult;

  const repoStats: RepoStats = {
    totalRepos: repos.length,
    totalStars: meta.totalStars,
    totalForks: meta.totalForks,
    avgStarsPerRepo: meta.avgStarsPerRepo,
    reposWithReadme: Math.round((repos.length * meta.readmeCoverage) / 100),
    reposWithDescription: Math.round((repos.length * meta.descriptionCoverage) / 100),
    mostStarredRepo:
      [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count)[0]?.name ?? null,
    topLanguages: Object.entries(languageDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([lang]) => lang),
  };

  const aiInsights = await generateAiInsights(user, repoStats, scoreResult, languageDistribution);

  const [saved] = await db
    .insert(analysesTable)
    .values({
      username: user.login,
      score: String(scoreBreakdown.total),
      hiringRecommendation: aiInsights.hiringRecommendation,
      avatarUrl: user.avatar_url,
      topLanguages: repoStats.topLanguages,
      profileJson: user as unknown as Record<string, unknown>,
      repoStatsJson: repoStats as unknown as Record<string, unknown>,
      languageDistributionJson: languageDistribution,
      scoreBreakdownJson: scoreBreakdown as unknown as Record<string, unknown>,
      aiInsightsJson: aiInsights as unknown as Record<string, unknown>,
    })
    .returning();

  logger.info({ username }, "Analysis complete — saving to DB");

  const result: AnalysisData = {
    id: saved.id,
    username: user.login,
    profile: user,
    repoStats,
    languageDistribution,
    scoreBreakdown,
    aiInsights,
    analyzedAt: saved.analyzedAt instanceof Date 
      ? saved.analyzedAt.toISOString() 
      : new Date(saved.analyzedAt).toISOString(),
    cached: false,
    cacheSource: null,
  };

  await setCached(username, result);

  return result;
}

export async function analyzeUser(username: string): Promise<AnalysisData> {
  // 1 — Cache hit (Redis → memory)
  const hit = await getCached(username);
  if (hit) {
    return { ...(hit.data as AnalysisData), cached: true, cacheSource: hit.source };
  }

  // 2 — In-flight deduplication: if another request is already running for this
  //     username, join it instead of spawning a duplicate GitHub + AI call.
  const existing = inFlight.get(username);
  if (existing) {
    logger.info({ username }, "[IN-FLIGHT] Joining existing request — deduplicating concurrent call");
    const result = await existing;
    return { ...result, cached: true, cacheSource: "in-flight" };
  }

  // 3 — New request: register it so concurrent callers can join
  const promise = _runAnalysis(username).finally(() => {
    inFlight.delete(username);
  });

  inFlight.set(username, promise);
  return promise;
}
