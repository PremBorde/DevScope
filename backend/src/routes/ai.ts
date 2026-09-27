import { Router, Request, Response, NextFunction } from "express";
import { generateContentWithFallback } from "@workspace/integrations-gemini-ai";
import { redisGet, redisSet, redisDel } from "../config/redis";
import { AppError } from "../lib/errors";

const router = Router();

const CACHE_TTL = 60 * 60 * 24 * 3; // 3 days cache (shorter to stay dynamic)

export type TargetRole = "fullstack" | "backend" | "ai_ml" | "frontend" | "devops" | "open_source";

function cacheKey(username: string, targetRole: string) {
  return `weekly-roadmap:${username.toLowerCase()}:${targetRole.toLowerCase()}`;
}

const ROLE_DESCRIPTIONS: Record<TargetRole, string> = {
  fullstack: "Senior Full-Stack Engineer (React/TypeScript/Node/PostgreSQL)",
  backend: "High-Performance Backend & Distributed Systems Engineer (Go/Rust/Node/Databases)",
  ai_ml: "AI & Machine Learning Engineer (Python/PyTorch/LLM Orchestration/LangChain)",
  frontend: "Lead Frontend Architect & UI Engineer (Next.js/React/Design Systems/Perf)",
  devops: "Cloud Infrastructure & Platform Engineer (Docker/K8s/CI-CD/Terraform)",
  open_source: "Open Source Creator & High-Impact Maintainer (Popular Libraries/Community)",
};

function buildPrompt(
  username: string,
  score: number,
  breakdown: Record<string, number>,
  weaknesses: string[],
  strengths: string[],
  targetRole: TargetRole,
  languages: string[] = [],
  topRepos: string[] = [],
): string {
  const roleTitle = ROLE_DESCRIPTIONS[targetRole] ?? ROLE_DESCRIPTIONS.fullstack;
  const seed = Date.now().toString(36); // Ensures variation

  return `
You are an elite Staff Engineer and career advisor mentoring @${username}.
They are targeting the role: ${roleTitle}.

ANALYSIS DATA:
- Developer: @${username}
- Current DevScope Score: ${score}/100
- Score Breakdown: ${JSON.stringify(breakdown)}
- Current Strengths: ${strengths.join("; ") || "General developer presence"}
- Key Weaknesses: ${weaknesses.join("; ") || "Needs deeper project polish and documentation"}
- Languages used: ${languages.join(", ") || "TypeScript, JavaScript"}
- Key Repositories: ${topRepos.join(", ") || "General repositories"}
- Run seed: ${seed}

TASK:
Craft a hyper-personalized, non-generic, 4-week GitHub roadmap specifically designed to level up this developer into a ${roleTitle}.
Reference their actual technologies and weak metrics. Do NOT produce generic advice like "work hard" or "learn Git".

WEEKLY THEMES:
- Week 1: Immediate Weakness Fixes & Quick Portfolio Wins (<2 hours per task)
- Week 2: Architectural Depth & Production Readiness (Testing, CI/CD, Documentation)
- Week 3: ${roleTitle} Specialization (Flagship Feature, Benchmark, or Showcase)
- Week 4: Industry Visibility & Open Source Polish (Live Demo, Community Packaging, Case Study)

REQUIREMENTS:
- Exactly 3 tasks per week.
- Each task must be a concrete, actionable bullet point (max 18 words).
- Tailor specifically to the ${roleTitle} path.

Return ONLY a valid JSON object in this exact shape:
{
  "week1": ["task 1", "task 2", "task 3"],
  "week2": ["task 1", "task 2", "task 3"],
  "week3": ["task 1", "task 2", "task 3"],
  "week4": ["task 1", "task 2", "task 3"]
}
`.trim();
}

function buildDynamicFallback(score: number, targetRole: TargetRole, username: string): Record<string, string[]> {
  const roleTasks: Record<TargetRole, { w3: string[]; w4: string[] }> = {
    fullstack: {
      w3: [
        "Architect and implement a secure JWT/OAuth auth flow with PostgreSQL in your flagship repo",
        "Add an end-to-end testing suite using Playwright or Cypress to test key user journeys",
        "Benchmark API response times and add Redis caching to improve database query latency",
      ],
      w4: [
        "Deploy your full-stack project to Render or Vercel with automated GitHub Actions CI/CD",
        "Write an interactive API documentation page with Swagger/OpenAPI for client integration",
        "Record an interactive 2-minute walkthrough GIF or Loom demo in the root README",
      ],
    },
    backend: {
      w3: [
        "Add database migration scripts, connection pooling, and indexing to eliminate slow queries",
        "Implement rate-limiting and structured JSON request logging with correlation IDs",
        "Write benchmark tests measuring request throughput under simulated load",
      ],
      w4: [
        "Containerize the backend with multi-stage Docker builds and docker-compose orchestration",
        "Implement health check, readiness probe, and Prometheus telemetry endpoints",
        "Publish an Architecture Decision Record (ADR) explaining your database and caching choices",
      ],
    },
    ai_ml: {
      w3: [
        "Build an AI agent or RAG pipeline repository demonstrating vector search and structured tool calls",
        "Add evaluation benchmarks comparing prompt performance and token latency",
        "Implement streaming responses and graceful error recovery for model timeouts",
      ],
      w4: [
        "Deploy an interactive HuggingFace Spaces or Streamlit live demo showcasing your model pipeline",
        "Add environment isolation with Docker and export dependencies with UV or Poetry",
        "Write a technical writeup on LinkedIn or Dev.to explaining your model inference pipeline",
      ],
    },
    frontend: {
      w3: [
        "Audit and optimize Lighthouse performance score to 95+ (image formats, bundle splitting, fonts)",
        "Build a reusable component library with Tailwind/CSS Modules documented in Storybook",
        "Add fluid keyboard navigation and WCAG AA accessibility compliance to your primary UI",
      ],
      w4: [
        "Add micro-interactions and smooth page transitions using Framer Motion or GSAP",
        "Deploy a zero-config live preview on Vercel with preview deployments per pull request",
        "Publish an open-source React hook or UI component to npm with full TypeScript definitions",
      ],
    },
    devops: {
      w3: [
        "Write reusable GitHub Actions composite workflows for linting, security scans, and test runs",
        "Define your cloud infrastructure as code using Terraform or OpenTofu with modular structure",
        "Set up Docker container vulnerability scanning with Trivy or Snyk in your CI pipeline",
      ],
      w4: [
        "Deploy a Kubernetes manifest or Helm chart with resource limits and ingress configuration",
        "Configure automated dependency updates with Renovate or Dependabot including auto-merge tests",
        "Document disaster recovery and rollback strategies in a dedicated RUNBOOK.md",
      ],
    },
    open_source: {
      w3: [
        "Add a CONTRIBUTING.md, Code of Conduct, and GitHub Issue/PR templates to your top repository",
        "Set up semantic versioning and automated changelog generation using Release Please",
        "Triage and resolve at least 2 open issues on well-known community repositories",
      ],
      w4: [
        "Package and publish your utility library to npm/PyPI with zero runtime dependencies",
        "Design a custom logo and interactive badge banner for your GitHub profile README",
        "Submit a talk or showcase post on HackerNews, Reddit r/webdev, or relevant Discord servers",
      ],
    },
  };

  const roleSpecific = roleTasks[targetRole] || roleTasks.fullstack;

  return {
    week1: [
      `Update @${username}'s top repository README with a live demo link, architecture diagram, and feature list`,
      "Add GitHub topics/tags and descriptive taglines to all public repositories to maximize discoverability",
      "Archive or mark private stale/empty repositories to focus recruiter attention on quality",
    ],
    week2: [
      "Add automated CI workflows (GitHub Actions) to run typechecks and tests on every commit",
      "Implement comprehensive unit tests targeting at least 70% coverage on your core business logic",
      "Draft a dedicated GitHub profile README highlighting your skills, current focus, and contact links",
    ],
    week3: roleSpecific.w3,
    week4: roleSpecific.w4,
  };
}

// POST /ai/roadmap
router.post("/roadmap", async (req: Request, res: Response, next: NextFunction) => {
  const {
    username,
    score,
    breakdown,
    weaknesses,
    strengths,
    targetRole = "fullstack",
    languages = [],
    topRepos = [],
    regenerate,
  } = req.body as {
    username: string;
    score: number;
    breakdown: Record<string, number>;
    weaknesses: string[];
    strengths: string[];
    targetRole?: TargetRole;
    languages?: string[];
    topRepos?: string[];
    regenerate?: boolean;
  };

  if (!username || typeof username !== "string" || !username.trim()) {
    return next(new AppError(400, "validation_error", "username is required"));
  }
  if (typeof score !== "number" || isNaN(score)) {
    return next(new AppError(400, "validation_error", "score must be a number"));
  }

  const role: TargetRole = [
    "fullstack",
    "backend",
    "ai_ml",
    "frontend",
    "devops",
    "open_source",
  ].includes(targetRole)
    ? targetRole
    : "fullstack";

  const key = cacheKey(username, role);

  if (regenerate) {
    await redisDel(key);
  } else {
    const cached = await redisGet(key);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        req.log?.info({ username, targetRole: role }, "Weekly roadmap served from cache");
        res.json({ ...parsed, cached: true });
        return;
      } catch {
        // Corrupt cache — continue to regenerate
      }
    }
  }

  let weeks: Record<string, string[]>;
  let modelUsed = "fallback";

  try {
    const prompt = buildPrompt(
      username,
      score,
      breakdown ?? {},
      Array.isArray(weaknesses) ? weaknesses : [],
      Array.isArray(strengths) ? strengths : [],
      role,
      Array.isArray(languages) ? languages : [],
      Array.isArray(topRepos) ? topRepos : [],
    );

    const { response, modelUsed: used } = await generateContentWithFallback({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.85,
        maxOutputTokens: 4096,
      },
    });

    modelUsed = used;
    const raw = response.text?.trim() ?? "";
    const parsed = JSON.parse(raw);

    if (!parsed.week1 || !parsed.week2 || !parsed.week3 || !parsed.week4) {
      throw new Error("Invalid roadmap structure from Gemini");
    }

    weeks = {
      week1: (parsed.week1 as string[]).slice(0, 3),
      week2: (parsed.week2 as string[]).slice(0, 3),
      week3: (parsed.week3 as string[]).slice(0, 3),
      week4: (parsed.week4 as string[]).slice(0, 3),
    };

    req.log?.info({ username, score, targetRole: role, modelUsed }, "Dynamic weekly roadmap generated by Gemini");
  } catch (err: any) {
    req.log?.warn({ err: err?.message || err, username, targetRole: role }, "Gemini weekly roadmap failed — using dynamic role fallback");
    weeks = buildDynamicFallback(score, role, username);
  }

  const payload = {
    username: username.toLowerCase(),
    score,
    targetRole: role,
    modelUsed,
    ...weeks,
    generatedAt: new Date().toISOString(),
    cached: false,
  };

  await redisSet(key, JSON.stringify(payload), CACHE_TTL);
  res.json(payload);
});

export default router;
