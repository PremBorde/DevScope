import { Router, Request, Response } from "express";
import { AnalyzeGithubUserParams } from "@workspace/api-zod";
import { db, analysesTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { ai } from "@workspace/integrations-gemini-ai";

const router = Router();

// In-memory cache: username -> { data, expiresAt }
const cache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface GithubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  location: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  html_url: string;
  message?: string;
}

interface GithubRepo {
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  has_readme?: boolean;
  updated_at: string;
  fork: boolean;
}

async function fetchGitHubUser(username: string): Promise<GithubUser> {
  const headers: Record<string, string> = { Accept: "application/vnd.github.v3+json" };
  const res = await fetch(`https://api.github.com/users/${username}`, { headers });
  if (res.status === 404) throw { status: 404, message: `GitHub user '${username}' not found` };
  if (res.status === 429 || res.status === 403) throw { status: 429, message: "GitHub API rate limit exceeded. Try again later." };
  if (!res.ok) throw { status: 500, message: `GitHub API error: ${res.status}` };
  return res.json() as Promise<GithubUser>;
}

async function fetchGitHubRepos(username: string): Promise<GithubRepo[]> {
  const headers: Record<string, string> = { Accept: "application/vnd.github.v3+json" };
  const res = await fetch(
    `https://api.github.com/users/${username}/repos?per_page=100&sort=updated&type=owner`,
    { headers }
  );
  if (!res.ok) return [];
  const repos = await res.json() as GithubRepo[];
  return repos.filter((r) => !r.fork);
}

function computeLanguageDistribution(repos: GithubRepo[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const repo of repos) {
    if (repo.language) {
      counts[repo.language] = (counts[repo.language] ?? 0) + 1;
    }
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return {};
  const dist: Record<string, number> = {};
  for (const [lang, count] of Object.entries(counts)) {
    dist[lang] = Math.round((count / total) * 100 * 10) / 10;
  }
  return dist;
}

function computeScore(
  user: GithubUser,
  repos: GithubRepo[],
  languageDist: Record<string, number>
) {
  const totalStars = repos.reduce((s, r) => s + r.stargazers_count, 0);
  const totalForks = repos.reduce((s, r) => s + r.forks_count, 0);
  const reposWithReadme = repos.filter((r) => r.description && r.description.length > 10).length;
  const reposWithDesc = repos.filter((r) => !!r.description).length;

  // Repo Quality (30): avg stars/repo, non-trivial repos
  const avgStars = repos.length > 0 ? totalStars / repos.length : 0;
  const qualityScore = Math.min(30, Math.round(
    (Math.min(repos.length, 20) / 20) * 15 +
    (Math.min(avgStars, 10) / 10) * 15
  ));

  // Activity Consistency (25): recent activity
  const now = Date.now();
  const recentRepos = repos.filter((r) => {
    const updated = new Date(r.updated_at).getTime();
    return now - updated < 365 * 24 * 60 * 60 * 1000;
  });
  const accountAgeYears = (now - new Date(user.created_at).getTime()) / (365 * 24 * 60 * 60 * 1000);
  const activityScore = Math.min(25, Math.round(
    (Math.min(recentRepos.length, 10) / 10) * 15 +
    Math.min(accountAgeYears / 5, 1) * 10
  ));

  // Tech Diversity (20): number of languages
  const langCount = Object.keys(languageDist).length;
  const diversityScore = Math.min(20, Math.round((Math.min(langCount, 10) / 10) * 20));

  // Popularity (15): stars + forks + followers
  const popularityScore = Math.min(15, Math.round(
    (Math.min(totalStars, 100) / 100) * 7 +
    (Math.min(user.followers, 100) / 100) * 5 +
    (Math.min(totalForks, 50) / 50) * 3
  ));

  // Completeness (10): bio, location, readme presence, description
  let completenessScore = 0;
  if (user.bio) completenessScore += 3;
  if (user.location) completenessScore += 2;
  if (repos.length > 0 && reposWithReadme / repos.length > 0.5) completenessScore += 3;
  if (repos.length > 0 && reposWithDesc / repos.length > 0.5) completenessScore += 2;

  const total = qualityScore + activityScore + diversityScore + popularityScore + completenessScore;

  return {
    scoreBreakdown: {
      repoQuality: qualityScore,
      activityConsistency: activityScore,
      techDiversity: diversityScore,
      popularity: popularityScore,
      completeness: completenessScore,
      total,
    },
    repoStats: {
      totalRepos: repos.length,
      totalStars,
      totalForks,
      avgStarsPerRepo: repos.length > 0 ? Math.round((totalStars / repos.length) * 10) / 10 : 0,
      reposWithReadme,
      reposWithDescription: reposWithDesc,
      mostStarredRepo: repos.sort((a, b) => b.stargazers_count - a.stargazers_count)[0]?.name ?? null,
      topLanguages: Object.entries(languageDist)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([lang]) => lang),
    },
  };
}

async function generateAiInsights(
  user: GithubUser,
  repoStats: ReturnType<typeof computeScore>["repoStats"],
  scoreBreakdown: ReturnType<typeof computeScore>["scoreBreakdown"],
  languageDist: Record<string, number>
) {
  const prompt = `You are a senior technical recruiter analyzing a GitHub profile. Provide a structured assessment.

GitHub Profile Data:
- Username: ${user.login}
- Name: ${user.name ?? "Not set"}
- Bio: ${user.bio ?? "Not set"}
- Account age: since ${user.created_at.split("T")[0]}
- Public repos: ${user.public_repos}
- Followers: ${user.followers}
- Total stars: ${repoStats.totalStars}
- Total forks: ${repoStats.totalForks}
- Languages: ${JSON.stringify(languageDist)}
- Top languages: ${repoStats.topLanguages.join(", ") || "None"}
- Most starred repo: ${repoStats.mostStarredRepo ?? "None"}
- Profile score: ${scoreBreakdown.total}/100

Score breakdown:
- Repo Quality: ${scoreBreakdown.repoQuality}/30
- Activity Consistency: ${scoreBreakdown.activityConsistency}/25  
- Tech Diversity: ${scoreBreakdown.techDiversity}/20
- Popularity: ${scoreBreakdown.popularity}/15
- Completeness: ${scoreBreakdown.completeness}/10

Return ONLY a JSON object with this exact structure:
{
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
  "hiringRecommendation": "strong_hire" | "hire" | "consider" | "pass",
  "summary": "2-3 sentence executive summary of this developer's profile"
}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    });

    const text = response.text ?? "{}";
    const parsed = JSON.parse(text);
    return {
      strengths: parsed.strengths ?? [],
      weaknesses: parsed.weaknesses ?? [],
      suggestions: parsed.suggestions ?? [],
      hiringRecommendation: parsed.hiringRecommendation ?? "consider",
      summary: parsed.summary ?? "No summary available.",
    };
  } catch {
    // Fallback insights
    const score = scoreBreakdown.total;
    return {
      strengths: [
        repoStats.totalStars > 10 ? "Has repos with community recognition" : "Active on GitHub",
        repoStats.topLanguages.length > 2 ? `Proficient in multiple languages: ${repoStats.topLanguages.slice(0, 3).join(", ")}` : "Focused technical skills",
        scoreBreakdown.activityConsistency > 15 ? "Consistent development activity" : "Has development history",
      ],
      weaknesses: [
        scoreBreakdown.completeness < 5 ? "Profile lacks completeness (bio, descriptions)" : "Could improve repo documentation",
        scoreBreakdown.popularity < 8 ? "Limited community engagement" : "Could contribute more to open source",
      ],
      suggestions: [
        "Add detailed README files to key repositories",
        "Contribute to popular open-source projects",
        "Showcase projects with live demos and documentation",
      ],
      hiringRecommendation: score >= 70 ? "hire" : score >= 50 ? "consider" : "pass",
      summary: `Developer with a score of ${score}/100. Has ${repoStats.totalRepos} public repositories across ${repoStats.topLanguages.length} languages.`,
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

  // Check cache
  const cached = cache.get(username.toLowerCase());
  if (cached && cached.expiresAt > Date.now()) {
    res.json({ ...cached.data, cached: true });
    return;
  }

  try {
    const [user, repos] = await Promise.all([
      fetchGitHubUser(username),
      fetchGitHubRepos(username),
    ]);

    const languageDistribution = computeLanguageDistribution(repos);
    const { scoreBreakdown, repoStats } = computeScore(user, repos, languageDistribution);
    const aiInsights = await generateAiInsights(user, repoStats, scoreBreakdown, languageDistribution);

    // Store in DB
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
      aiInsights,
      analyzedAt: saved.analyzedAt.toISOString(),
      cached: false,
    };

    // Cache the result
    cache.set(username.toLowerCase(), { data: result, expiresAt: Date.now() + CACHE_TTL_MS });

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
