import { Router, Request, Response } from "express";
import { AnalyzeGithubUserParams } from "@workspace/api-zod";
import { db, analysesTable } from "@workspace/db";
import { ai } from "@workspace/integrations-gemini-ai";
import { calculateScore, type ScoredUser, type ScoredRepo } from "../services/scoring.service";
import { getCached, setCached } from "../services/github-cache.service";

const router = Router();

interface GithubUser extends ScoredUser {
  message?: string;
}

interface GithubRepo extends ScoredRepo {}

async function fetchGitHubUser(username: string): Promise<GithubUser> {
  const res = await fetch(`https://api.github.com/users/${username}`, {
    headers: { Accept: "application/vnd.github.v3+json" },
  });
  if (res.status === 404) throw { status: 404, message: `GitHub user '${username}' not found` };
  if (res.status === 429 || res.status === 403) throw { status: 429, message: "GitHub API rate limit exceeded. Try again later." };
  if (!res.ok) throw { status: 500, message: `GitHub API error: ${res.status}` };
  return res.json() as Promise<GithubUser>;
}

async function fetchGitHubRepos(username: string): Promise<GithubRepo[]> {
  const res = await fetch(
    `https://api.github.com/users/${username}/repos?per_page=100&sort=updated&type=owner`,
    { headers: { Accept: "application/vnd.github.v3+json" } }
  );
  if (!res.ok) return [];
  const repos = await res.json() as GithubRepo[];
  return repos.filter((r) => !r.fork);
}

function computeLanguageDistribution(repos: GithubRepo[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const repo of repos) {
    if (repo.language) counts[repo.language] = (counts[repo.language] ?? 0) + 1;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return {};
  return Object.fromEntries(
    Object.entries(counts).map(([k, v]) => [k, Math.round((v / total) * 1000) / 10])
  );
}

async function generateAiInsights(
  user: GithubUser,
  repoStats: {
    totalRepos: number;
    totalStars: number;
    totalForks: number;
    avgStarsPerRepo: number;
    mostStarredRepo: string | null;
    topLanguages: string[];
  },
  scoreResult: ReturnType<typeof calculateScore>,
  languageDist: Record<string, number>
) {
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
  } catch {
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
        scoreBreakdown.completeness < 6 ? "Profile completeness needs improvement (bio, descriptions)" : "Could improve repo documentation coverage",
        meta.daysSinceLastCommit > 90 ? `No GitHub activity in ${meta.daysSinceLastCommit} days` : "Limited community engagement (forks/stars)",
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

router.get("/:username", async (req: Request, res: Response) => {
  const parseResult = AnalyzeGithubUserParams.safeParse(req.params);
  if (!parseResult.success) {
    res.status(400).json({ error: "validation_error", message: "Invalid username" });
    return;
  }

  const { username } = parseResult.data;

  // ── Cache lookup (Redis → memory fallback) ──────────────────────────────
  const hit = await getCached(username);
  if (hit) {
    res.json({ ...(hit.data as object), cached: true, cacheSource: hit.source });
    return;
  }

  try {
    // ── Cache MISS — fetch from GitHub API ──────────────────────────────
    const [user, repos] = await Promise.all([
      fetchGitHubUser(username),
      fetchGitHubRepos(username),
    ]);

    const languageDistribution = computeLanguageDistribution(repos);
    const scoreResult = calculateScore(user, repos, languageDistribution);

    const { flat: scoreBreakdown, meta } = scoreResult;

    const repoStats = {
      totalRepos: repos.length,
      totalStars: meta.totalStars,
      totalForks: meta.totalForks,
      avgStarsPerRepo: meta.avgStarsPerRepo,
      reposWithReadme: Math.round(repos.length * meta.readmeCoverage / 100),
      reposWithDescription: Math.round(repos.length * meta.descriptionCoverage / 100),
      mostStarredRepo: [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count)[0]?.name ?? null,
      topLanguages: Object.entries(languageDistribution)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([lang]) => lang),
    };

    const aiInsights = await generateAiInsights(user, repoStats, scoreResult, languageDistribution);

    const [saved] = await db.insert(analysesTable).values({
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
    }).returning();

    const result = {
      id: saved.id,
      username: user.login,
      profile: user,
      repoStats,
      languageDistribution,
      scoreBreakdown,
      scoreDetails: scoreResult.breakdown,
      aiInsights,
      analyzedAt: saved.analyzedAt.toISOString(),
      cached: false,
      cacheSource: null,
    };

    // ── Store in Redis + memory (TTL 1800s) ─────────────────────────────
    await setCached(username, result);

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
