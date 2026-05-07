/**
 * Deterministic GitHub Scoring Engine for DevScope AI
 * Every point is earned by a transparent, weighted formula.
 * No randomness. No magic numbers.
 */

export interface ScoredRepo {
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  fork: boolean;
}

export interface ScoredUser {
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
}

export interface CategoryScore {
  score: number;
  max: number;
  reason: string;
  sub: Record<string, { value: number; max: number; note: string }>;
}

export interface ScoreResult {
  total: number;
  breakdown: {
    repoQuality: CategoryScore;
    activity: CategoryScore;
    diversity: CategoryScore;
    popularity: CategoryScore;
    completeness: CategoryScore;
  };
  /** Flat format kept for API/frontend backward compatibility */
  flat: {
    repoQuality: number;
    activityConsistency: number;
    techDiversity: number;
    popularity: number;
    completeness: number;
    total: number;
  };
  meta: {
    ownedRepos: number;
    totalStars: number;
    totalForks: number;
    avgStarsPerRepo: number;
    readmeCoverage: number;
    descriptionCoverage: number;
    distinctLanguages: number;
    daysSinceLastCommit: number;
    activeRepoRatio: number;
    accountAgeYears: number;
  };
}

// ─── Tier weights for modern/industry languages ────────────────────────────
const LANG_TIERS: Record<string, number> = {
  // Tier 1 — high demand, modern (2.0 pts each)
  TypeScript: 2.0, Rust: 2.0, Go: 2.0, Kotlin: 2.0, Swift: 2.0,
  Dart: 1.8, Elixir: 1.8, "F#": 1.8,

  // Tier 2 — strong demand (1.5 pts each)
  Python: 1.5, JavaScript: 1.5, Java: 1.5, "C#": 1.5, "C++": 1.5,
  Scala: 1.4, Haskell: 1.4,

  // Tier 3 — standard (1.0 pt each)
  Ruby: 1.0, PHP: 1.0, Lua: 1.0, R: 1.0,
  Shell: 0.8, Dockerfile: 0.7, HTML: 0.5, CSS: 0.5,
};

function logNorm(value: number, scale: number): number {
  return Math.log10(value + 1) / Math.log10(scale + 1);
}

function clamp(v: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, v));
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

// ─── 1. Repo Quality (max 30) ─────────────────────────────────────────────
function scoreRepoQuality(repos: ScoredRepo[]): CategoryScore {
  const MAX = 30;
  if (repos.length === 0) {
    return {
      score: 0, max: MAX,
      reason: "No owned repositories found",
      sub: {
        readmeCoverage: { value: 0, max: 12, note: "No repos" },
        starAvg: { value: 0, max: 10, note: "No repos" },
        descCoverage: { value: 0, max: 8, note: "No repos" },
      },
    };
  }

  const totalStars = repos.reduce((s, r) => s + r.stargazers_count, 0);
  const avgStars = totalStars / repos.length;

  // README proxy: description >= 40 chars is a strong signal the dev documents work
  const readmeRepos = repos.filter(r => r.description && r.description.length >= 40).length;
  const readmeRatio = readmeRepos / repos.length;
  const readmeScore = round1(readmeRatio * 12);

  // Stars: log-normalized against a "good" baseline of 50 avg stars
  const starScore = round1(clamp(logNorm(avgStars, 50)) * 10);

  // Description coverage: % with any description
  const descRepos = repos.filter(r => r.description && r.description.trim().length > 0).length;
  const descRatio = descRepos / repos.length;
  const descScore = round1(descRatio * 8);

  const total = Math.min(MAX, Math.round(readmeScore + starScore + descScore));

  const reason =
    readmeRatio < 0.2 ? "Low README/description coverage — most repos are undocumented" :
    readmeRatio < 0.5 ? "Moderate documentation — fewer than half of repos have descriptions" :
    avgStars < 1      ? "Good documentation but repos have low community recognition" :
    avgStars < 10     ? "Solid documentation and some community stars" :
                        "Well-documented repos with strong star count";

  return {
    score: total, max: MAX, reason,
    sub: {
      readmeCoverage:  { value: readmeScore, max: 12, note: `${Math.round(readmeRatio * 100)}% of repos have meaningful descriptions (${readmeRepos}/${repos.length})` },
      avgStarsPerRepo: { value: starScore,   max: 10, note: `${round1(avgStars)} avg stars/repo (log-normalized)` },
      descCoverage:    { value: descScore,   max: 8,  note: `${Math.round(descRatio * 100)}% of repos have any description` },
    },
  };
}

// ─── 2. Activity Consistency (max 25) ────────────────────────────────────
function scoreActivity(user: ScoredUser, repos: ScoredRepo[]): CategoryScore {
  const MAX = 25;
  const now = Date.now();

  // Days since most recently updated repo
  const sortedByDate = [...repos].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
  const lastUpdated = sortedByDate[0] ? new Date(sortedByDate[0].updated_at).getTime() : 0;
  const daysSinceLast = lastUpdated ? Math.floor((now - lastUpdated) / 86_400_000) : 9999;

  // Recency score (0-12): sharp decay after 90 days
  const recencyScore =
    daysSinceLast <= 7   ? 12 :
    daysSinceLast <= 30  ? 11 :
    daysSinceLast <= 60  ? 9  :
    daysSinceLast <= 90  ? 7  :
    daysSinceLast <= 180 ? 5  :
    daysSinceLast <= 365 ? 3  :
                           0;

  // Active repo ratio last 12 months (0-8)
  const oneYear = 365 * 86_400_000;
  const activeRepos = repos.filter(r => now - new Date(r.updated_at).getTime() < oneYear).length;
  const activeRatio = repos.length > 0 ? activeRepos / repos.length : 0;
  const activeScore = round1(clamp(activeRatio) * 8);

  // Account maturity (0-5): rewards developers with established presence (cap at 4 years)
  const accountAgeYears = (now - new Date(user.created_at).getTime()) / (365 * 86_400_000);
  const maturityScore = round1(clamp(accountAgeYears / 4) * 5);

  const total = Math.min(MAX, Math.round(recencyScore + activeScore + maturityScore));

  const reason =
    daysSinceLast <= 30  ? "Very recently active — commits in the past month" :
    daysSinceLast <= 90  ? "Moderately active — last push within 3 months" :
    daysSinceLast <= 180 ? "Somewhat active — last push within 6 months" :
    daysSinceLast <= 365 ? "Low activity — last push over 6 months ago" :
                           "Inactive — no activity in over a year";

  return {
    score: total, max: MAX, reason,
    sub: {
      recency:    { value: recencyScore, max: 12, note: `${daysSinceLast} days since last repo update` },
      activeRatio:{ value: activeScore,  max: 8,  note: `${activeRepos}/${repos.length} repos updated in last 12 months` },
      maturity:   { value: maturityScore,max: 5,  note: `${round1(accountAgeYears)} years on GitHub (max 4yr)` },
    },
  };
}

// ─── 3. Tech Diversity (max 20) ───────────────────────────────────────────
function scoreDiversity(languageDist: Record<string, number>): CategoryScore {
  const MAX = 20;
  const langs = Object.keys(languageDist);
  const distinctCount = langs.length;

  // Language breadth (0-10): log-normalized against 10 languages
  const breadthScore = round1(clamp(logNorm(distinctCount, 10)) * 10);

  // Modern language quality score (0-10): weighted tier sum, capped at 10
  let tierTotal = 0;
  const tierHits: string[] = [];
  for (const lang of langs) {
    const weight = LANG_TIERS[lang] ?? 0.3;
    if (LANG_TIERS[lang] !== undefined) tierHits.push(lang);
    tierTotal += weight;
  }
  const qualityScore = round1(clamp(tierTotal / 10) * 10);

  const total = Math.min(MAX, Math.round(breadthScore + qualityScore));

  const reason =
    distinctCount === 0 ? "No language data available" :
    distinctCount <= 2  ? `Narrow stack — only ${distinctCount} language(s) detected` :
    distinctCount <= 4  ? `Moderate diversity — ${distinctCount} languages` :
    distinctCount <= 7  ? `Good breadth — ${distinctCount} languages including ${tierHits.slice(0, 2).join(", ")}` :
                          `Strong polyglot profile — ${distinctCount} languages`;

  return {
    score: total, max: MAX, reason,
    sub: {
      langBreadth: { value: breadthScore, max: 10, note: `${distinctCount} distinct language(s) (log-normalized vs 10)` },
      langQuality: { value: qualityScore, max: 10, note: tierHits.length > 0 ? `Industry languages: ${tierHits.slice(0, 5).join(", ")}` : "No recognized industry languages" },
    },
  };
}

// ─── 4. Popularity (max 15) ───────────────────────────────────────────────
function scorePopularity(user: ScoredUser, repos: ScoredRepo[]): CategoryScore {
  const MAX = 15;
  const totalStars = repos.reduce((s, r) => s + r.stargazers_count, 0);
  const totalForks = repos.reduce((s, r) => s + r.forks_count, 0);

  // Stars: log-normalized vs 500 stars = "good" baseline
  const starScore = round1(clamp(logNorm(totalStars, 500)) * 8);

  // Forks: log-normalized vs 200 forks
  const forkScore = round1(clamp(logNorm(totalForks, 200)) * 4);

  // Followers: log-normalized vs 500
  const followerScore = round1(clamp(logNorm(user.followers, 500)) * 3);

  const total = Math.min(MAX, Math.round(starScore + forkScore + followerScore));

  const reason =
    totalStars === 0 && user.followers < 5 ? "No community traction yet — no stars or followers" :
    totalStars < 10 && user.followers < 20 ? "Early community presence — limited stars and followers" :
    totalStars < 50                         ? `Growing recognition — ${totalStars} stars, ${user.followers} followers` :
    totalStars < 500                        ? `Solid community presence — ${totalStars} stars across repos` :
                                              `Strong community traction — ${totalStars} stars, ${user.followers} followers`;

  return {
    score: total, max: MAX, reason,
    sub: {
      totalStars:  { value: starScore,     max: 8, note: `${totalStars} total stars (log-norm vs 500)` },
      totalForks:  { value: forkScore,     max: 4, note: `${totalForks} total forks (log-norm vs 200)` },
      followers:   { value: followerScore, max: 3, note: `${user.followers} followers (log-norm vs 500)` },
    },
  };
}

// ─── 5. Completeness (max 10) ─────────────────────────────────────────────
function scoreCompleteness(user: ScoredUser, repos: ScoredRepo[]): CategoryScore {
  const MAX = 10;
  let total = 0;
  const missing: string[] = [];
  const present: string[] = [];

  // Bio (0-3): meaningful bio >= 20 chars
  let bioScore = 0;
  if (user.bio && user.bio.trim().length >= 20) { bioScore = 3; present.push("bio"); }
  else if (user.bio && user.bio.trim().length > 0) { bioScore = 1; }
  else { missing.push("bio"); }
  total += bioScore;

  // Avatar (0-2): non-default GitHub avatar (custom photo)
  const hasCustomAvatar = !user.avatar_url.includes("identicon") && !user.avatar_url.includes("gravatar");
  const avatarScore = hasCustomAvatar ? 2 : 0;
  total += avatarScore;
  if (!hasCustomAvatar) missing.push("profile photo");
  else present.push("profile photo");

  // Location (0-1)
  const locScore = user.location ? 1 : 0;
  total += locScore;
  if (!user.location) missing.push("location");
  else present.push("location");

  // Website/blog (0-1)
  const blogScore = user.blog && user.blog.trim().length > 0 ? 1 : 0;
  total += blogScore;
  if (!blogScore) missing.push("website");
  else present.push("website");

  // Repo description coverage >= 60% (0-2)
  const descRatio = repos.length > 0
    ? repos.filter(r => r.description && r.description.trim().length > 0).length / repos.length
    : 0;
  const repoDescScore = descRatio >= 0.6 ? 2 : descRatio >= 0.3 ? 1 : 0;
  total += repoDescScore;
  if (repoDescScore < 2) missing.push(`repo descriptions (${Math.round(descRatio * 100)}% covered)`);
  else present.push("repo descriptions");

  total = Math.min(MAX, total);

  const reason =
    missing.length === 0 ? "Fully complete professional profile" :
    missing.length <= 2  ? `Nearly complete — missing: ${missing.join(", ")}` :
    present.length <= 1  ? `Sparse profile — add: ${missing.slice(0, 3).join(", ")}` :
                           `Partially complete — missing: ${missing.slice(0, 3).join(", ")}`;

  return {
    score: total, max: MAX, reason,
    sub: {
      bio:          { value: bioScore,      max: 3, note: user.bio ? `Bio: "${user.bio.slice(0, 50)}..."` : "No bio set" },
      avatar:       { value: avatarScore,   max: 2, note: hasCustomAvatar ? "Custom avatar detected" : "Default/Gravatar avatar" },
      location:     { value: locScore,      max: 1, note: user.location ?? "Not set" },
      website:      { value: blogScore,     max: 1, note: (user.blog && user.blog.trim()) ? user.blog : "Not set" },
      repoDescRatio:{ value: repoDescScore, max: 2, note: `${Math.round(descRatio * 100)}% of repos have descriptions` },
    },
  };
}

// ─── Main exported function ───────────────────────────────────────────────
export function calculateScore(
  user: ScoredUser,
  repos: ScoredRepo[],
  languageDistribution: Record<string, number>
): ScoreResult {
  const ownedRepos = repos.filter(r => !r.fork);

  const repoQuality  = scoreRepoQuality(ownedRepos);
  const activity     = scoreActivity(user, ownedRepos);
  const diversity    = scoreDiversity(languageDistribution);
  const popularity   = scorePopularity(user, ownedRepos);
  const completeness = scoreCompleteness(user, ownedRepos);

  const total = repoQuality.score + activity.score + diversity.score +
                popularity.score + completeness.score;

  const totalStars = ownedRepos.reduce((s, r) => s + r.stargazers_count, 0);
  const totalForks = ownedRepos.reduce((s, r) => s + r.forks_count, 0);
  const now = Date.now();
  const sortedByDate = [...ownedRepos].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
  const lastUpdated = sortedByDate[0] ? new Date(sortedByDate[0].updated_at).getTime() : 0;
  const daysSinceLast = lastUpdated ? Math.floor((now - lastUpdated) / 86_400_000) : 9999;
  const oneYear = 365 * 86_400_000;
  const activeRepos = ownedRepos.filter(r => now - new Date(r.updated_at).getTime() < oneYear).length;

  return {
    total,
    breakdown: { repoQuality, activity, diversity, popularity, completeness },
    flat: {
      repoQuality:         repoQuality.score,
      activityConsistency: activity.score,
      techDiversity:       diversity.score,
      popularity:          popularity.score,
      completeness:        completeness.score,
      total,
    },
    meta: {
      ownedRepos:         ownedRepos.length,
      totalStars,
      totalForks,
      avgStarsPerRepo:    ownedRepos.length > 0 ? Math.round((totalStars / ownedRepos.length) * 10) / 10 : 0,
      readmeCoverage:     ownedRepos.length > 0
                            ? Math.round(ownedRepos.filter(r => r.description && r.description.length >= 40).length / ownedRepos.length * 100)
                            : 0,
      descriptionCoverage:ownedRepos.length > 0
                            ? Math.round(ownedRepos.filter(r => r.description && r.description.trim().length > 0).length / ownedRepos.length * 100)
                            : 0,
      distinctLanguages:  Object.keys(languageDistribution).length,
      daysSinceLastCommit: daysSinceLast,
      activeRepoRatio:    ownedRepos.length > 0 ? Math.round((activeRepos / ownedRepos.length) * 100) : 0,
      accountAgeYears:    Math.round(((now - new Date(user.created_at).getTime()) / (365 * 86_400_000)) * 10) / 10,
    },
  };
}
