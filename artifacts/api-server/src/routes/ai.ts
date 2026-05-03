import { Router, Request, Response } from "express";
import { ai } from "@workspace/integrations-gemini-ai";
import { redisGet, redisSet, redisDel } from "../config/redis";

const router = Router();

const CACHE_TTL = 60 * 60 * 24 * 7; // 7 days

function cacheKey(username: string) {
  return `weekly-roadmap:${username.toLowerCase()}`;
}

function buildPrompt(
  username: string,
  score: number,
  breakdown: Record<string, number>,
  weaknesses: string[],
  strengths: string[]
): string {
  return `
You are a brutally honest senior engineering career mentor.

Generate a strict 4-week GitHub improvement roadmap for the developer @${username}.

THEIR ANALYSIS:
- Overall Score: ${score}/100
- Score Breakdown: ${JSON.stringify(breakdown)}
- Strengths: ${strengths.join("; ")}
- Weaknesses: ${weaknesses.join("; ")}

REQUIREMENTS:
- Be brutally honest and hyper-specific. No generic advice.
- Reference their ACTUAL numbers from the breakdown above.
- Each week must have exactly 3 tasks.
- Tasks must be concrete actions (not vague goals).
- Focus areas: project quality, GitHub presence, technical depth, real-world readiness.
- Week 1: Quick wins based on biggest weaknesses (things that take < 2 hours each)
- Week 2: Project depth improvements (README, tests, CI/CD)
- Week 3: Visibility & community presence (pinned repos, topics, profile README)
- Week 4: Portfolio-level polish and new project kickoff

Return ONLY valid JSON. No markdown, no explanation, no extra text:
{
  "week1": ["task1", "task2", "task3"],
  "week2": ["task1", "task2", "task3"],
  "week3": ["task1", "task2", "task3"],
  "week4": ["task1", "task2", "task3"]
}
`.trim();
}

function buildFallback(score: number): Record<string, string[]> {
  if (score < 50) {
    return {
      week1: [
        "Add a professional README.md to your top 3 repositories with description, setup instructions, and screenshots",
        "Write a GitHub profile README that highlights your skills, current projects, and contact info",
        "Add descriptive topics/tags to every public repository",
      ],
      week2: [
        "Implement automated tests (unit or integration) in your most-starred repository",
        "Add a GitHub Actions CI workflow that runs linting and tests on every PR",
        "Break your largest repository into clearly named modules with documented functions",
      ],
      week3: [
        "Pin your 6 best repositories to your profile — choose for variety and quality over quantity",
        "Contribute to one open-source project: find a 'good first issue' and submit a PR",
        "Publish a short technical blog post or dev.to article about a problem you recently solved",
      ],
      week4: [
        "Start a new project that solves a real problem you personally face — deploy it live",
        "Add a CONTRIBUTING.md and issue templates to your best project",
        "Record a 2-minute demo video for your top project and link it in the README",
      ],
    };
  }
  if (score < 70) {
    return {
      week1: [
        "Update all repository READMEs to include live demo links, tech stack badges, and screenshots",
        "Audit and delete or archive repositories with zero activity and no README",
        "Add a professional bio, website link, and location to your GitHub profile",
      ],
      week2: [
        "Achieve >70% test coverage on your most-used library or API project",
        "Set up semantic versioning and a CHANGELOG.md on your primary project",
        "Add Docker support (Dockerfile + docker-compose) to your main project",
      ],
      week3: [
        "Open-source a reusable utility you've built — write thorough docs and publish to npm or PyPI",
        "Give a lightning talk or write a detailed technical post about your architecture decisions",
        "Engage in code reviews on at least 3 open-source PRs this week",
      ],
      week4: [
        "Build and ship a full-stack project with auth, a database, and a live deployment URL",
        "Add GitHub Discussions to your most active project and seed it with FAQs",
        "Request and display testimonials or endorsements from collaborators in your README",
      ],
    };
  }
  return {
    week1: [
      "Audit your top project for security vulnerabilities using Snyk or npm audit — fix all critical issues",
      "Add comprehensive API documentation using OpenAPI/Swagger to your main project",
      "Write architecture decision records (ADRs) for your major design choices",
    ],
    week2: [
      "Achieve >90% test coverage across unit, integration, and e2e tests on your flagship project",
      "Implement performance monitoring and error tracking (Sentry or similar) in a live project",
      "Refactor your most complex module to follow SOLID principles — document the refactor",
    ],
    week3: [
      "Publish a detailed case study of your most impressive project to your blog or LinkedIn",
      "Speak at a local meetup or submit a talk proposal to a technical conference",
      "Mentor a junior developer publicly — create a YouTube tutorial or livestream a coding session",
    ],
    week4: [
      "Build a proof-of-concept using a cutting-edge technology relevant to your domain",
      "Create a comprehensive starter template or boilerplate and publish it to GitHub",
      "Apply to speak at a major tech conference or submit an article to a recognized publication",
    ],
  };
}

// POST /ai/roadmap
router.post("/roadmap", async (req: Request, res: Response) => {
  const { username, score, breakdown, weaknesses, strengths, regenerate } = req.body as {
    username: string;
    score: number;
    breakdown: Record<string, number>;
    weaknesses: string[];
    strengths: string[];
    regenerate?: boolean;
  };

  if (!username || typeof score !== "number") {
    res.status(400).json({ error: "validation_error", message: "username and score are required" });
    return;
  }

  const key = cacheKey(username);

  // Clear cache if regenerating
  if (regenerate) {
    await redisDel(key);
  } else {
    // Return cached roadmap if available
    const cached = await redisGet(key);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        req.log?.info({ username }, "Weekly roadmap served from cache");
        res.json({ ...parsed, cached: true });
        return;
      } catch {
        // Corrupt cache — continue to regenerate
      }
    }
  }

  let weeks: Record<string, string[]>;

  try {
    const prompt = buildPrompt(
      username,
      score,
      breakdown ?? {},
      Array.isArray(weaknesses) ? weaknesses : [],
      Array.isArray(strengths) ? strengths : []
    );

    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json" },
    });

    const raw = result.text?.trim() ?? "";
    const parsed = JSON.parse(raw);

    if (!parsed.week1 || !parsed.week2 || !parsed.week3 || !parsed.week4) {
      throw new Error("Invalid roadmap structure from Gemini");
    }

    // Ensure exactly 3 tasks per week
    weeks = {
      week1: (parsed.week1 as string[]).slice(0, 3),
      week2: (parsed.week2 as string[]).slice(0, 3),
      week3: (parsed.week3 as string[]).slice(0, 3),
      week4: (parsed.week4 as string[]).slice(0, 3),
    };

    req.log?.info({ username, score }, "Weekly roadmap generated by Gemini");
  } catch (err) {
    req.log?.warn({ err, username }, "Gemini weekly roadmap failed — using fallback");
    weeks = buildFallback(score);
  }

  const payload = {
    username: username.toLowerCase(),
    score,
    ...weeks,
    generatedAt: new Date().toISOString(),
    cached: false,
  };

  await redisSet(key, JSON.stringify(payload), CACHE_TTL);
  res.json(payload);
});

export default router;
