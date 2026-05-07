import { Router, Request, Response } from "express";
import { calculateScore } from "../services/scoring.service";
import { getCached, setCached, CACHE_TTL_SECONDS } from "../services/github-cache.service";

const router = Router();

interface GithubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  location: string | null;
  blog?: string | null;
  email?: string | null;
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
  updated_at: string;
  fork: boolean;
}

async function fetchGitHubUser(username: string): Promise<GithubUser> {
  const res = await fetch(`https://api.github.com/users/${username}`, {
    headers: { Accept: "application/vnd.github.v3+json" },
  });
  if (res.status === 404) throw { status: 404, message: `GitHub user '${username}' not found` };
  if (res.status === 429 || res.status === 403) throw { status: 429, message: "GitHub API rate limit exceeded" };
  if (!res.ok) throw { status: 500, message: `GitHub API error: ${res.status}` };
  return res.json() as Promise<GithubUser>;
}

async function fetchGitHubRepos(username: string): Promise<GithubRepo[]> {
  const res = await fetch(
    `https://api.github.com/users/${username}/repos?per_page=100&sort=updated&type=owner`,
    { headers: { Accept: "application/vnd.github.v3+json" } }
  );
  if (!res.ok) return [];
  return res.json() as Promise<GithubRepo[]>;
}

function computeLanguageDistribution(repos: GithubRepo[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const repo of repos.filter(r => !r.fork)) {
    if (repo.language) counts[repo.language] = (counts[repo.language] ?? 0) + 1;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return {};
  return Object.fromEntries(
    Object.entries(counts).map(([k, v]) => [k, Math.round((v / total) * 1000) / 10])
  );
}

// Cache key namespace for debug route (separate from full-analysis cache)
const DEBUG_NAMESPACE = "__debug__";

router.get("/:username", async (req: Request, res: Response) => {
  const { username } = req.params;
  if (!username || typeof username !== "string") {
    res.status(400).json({ error: "bad_request", message: "Username is required" });
    return;
  }

  // ── Cache lookup for debug scores ──────────────────────────────────────
  const debugUsername = `${DEBUG_NAMESPACE}${username}`;
  const hit = await getCached(debugUsername);
  if (hit) {
    res.json({ ...(hit.data as object), cached: true, cacheSource: hit.source });
    return;
  }

  try {
    const [user, allRepos] = await Promise.all([
      fetchGitHubUser(username),
      fetchGitHubRepos(username),
    ]);

    const languageDistribution = computeLanguageDistribution(allRepos);
    const result = calculateScore(user, allRepos, languageDistribution);

    const grade =
      result.total >= 80 ? "A" :
      result.total >= 70 ? "B" :
      result.total >= 55 ? "C" :
      result.total >= 40 ? "D" : "F";

    const response = {
      username: user.login,
      name: user.name,
      score: result.total,
      grade,
      breakdown: {
        repoQuality:  { score: result.breakdown.repoQuality.score,  max: result.breakdown.repoQuality.max,  reason: result.breakdown.repoQuality.reason,  sub: result.breakdown.repoQuality.sub },
        activity:     { score: result.breakdown.activity.score,     max: result.breakdown.activity.max,     reason: result.breakdown.activity.reason,     sub: result.breakdown.activity.sub },
        diversity:    { score: result.breakdown.diversity.score,    max: result.breakdown.diversity.max,    reason: result.breakdown.diversity.reason,    sub: result.breakdown.diversity.sub },
        popularity:   { score: result.breakdown.popularity.score,   max: result.breakdown.popularity.max,   reason: result.breakdown.popularity.reason,   sub: result.breakdown.popularity.sub },
        completeness: { score: result.breakdown.completeness.score, max: result.breakdown.completeness.max, reason: result.breakdown.completeness.reason, sub: result.breakdown.completeness.sub },
      },
      meta: result.meta,
      scoringVersion: "2.0.0-deterministic",
      cacheTtlSeconds: CACHE_TTL_SECONDS,
      explanation: {
        repoQuality:  "README/description coverage (12) + avg stars log-norm (10) + any-description ratio (8)",
        activity:     "Days-since-last-commit tier (12) + active-repo ratio last 12mo (8) + account maturity (5)",
        diversity:    "Language breadth log-norm (10) + industry-language tier weights (10)",
        popularity:   "Total stars log-norm vs 500 (8) + forks log-norm vs 200 (4) + followers log-norm vs 500 (3)",
        completeness: "Meaningful bio (3) + custom avatar (2) + location (1) + website (1) + repo desc ratio (2)",
      },
      cached: false,
      cacheSource: null,
    };

    // Cache the debug result too
    await setCached(debugUsername, response);

    res.json(response);
  } catch (err: unknown) {
    const apiErr = err as { status?: number; message?: string };
    if (apiErr.status === 404) {
      res.status(404).json({ error: "not_found", message: apiErr.message });
    } else if (apiErr.status === 429) {
      res.status(429).json({ error: "rate_limit", message: apiErr.message });
    } else {
      req.log?.error({ err }, "debug-score failed");
      res.status(500).json({ error: "internal_error", message: "Failed to compute score" });
    }
  }
});

export default router;
