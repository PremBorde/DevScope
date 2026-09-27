import { Router, Request, Response, NextFunction } from "express";
import { generateContentWithFallback } from "@workspace/integrations-gemini-ai";
import { redisGet, redisSet } from "../config/redis";
import { AppError } from "../lib/errors";

const router = Router();
const CACHE_TTL = 60 * 60 * 24 * 3; // 3 days

interface ResumeBullet {
  repoName: string;
  bullet: string;
  actionVerb: string;
  quantifiedImpact: string;
  techStack: string[];
}

// POST /api/ai/resume-bullets
router.post("/resume-bullets", async (req: Request, res: Response, next: NextFunction) => {
  const { username, topRepos = [], languages = [], totalStars = 0 } = req.body as {
    username: string;
    topRepos?: string[];
    languages?: string[];
    totalStars?: number;
  };

  if (!username || typeof username !== "string") {
    return next(new AppError(400, "validation_error", "Username is required"));
  }

  const cacheKey = `resume-bullets:${username.toLowerCase()}`;
  const cached = await redisGet(cacheKey);
  if (cached) {
    try {
      return res.json(JSON.parse(cached));
    } catch {
      // corrupt — continue
    }
  }

  const prompt = `You are a Principal Tech Recruiter and Resume Coach specializing in Silicon Valley FAANG and top startup resumes.
Translate the developer portfolio of @${username} into 4 polished, high-impact resume bullet points.

Profile Information:
- Developer: @${username}
- Starred repositories: ${topRepos.join(", ") || "Full-stack apps, APIs"}
- Key languages: ${languages.join(", ") || "TypeScript, Node, Python, React"}
- Portfolio recognition: ${totalStars} total GitHub stars

FORMULA TO FOLLOW (Google XYZ Standard):
"Accomplished [X] as measured by [Y], by doing [Z]"
Use strong active verbs (Architected, Engineered, Implemented, Scaled, Streamlined).

Return ONLY a valid JSON object in this exact shape:
{
  "bullets": [
    {
      "repoName": "Name of relevant project/repo",
      "bullet": "Full resume bullet point following the X-Y-Z formula",
      "actionVerb": "e.g. Architected",
      "quantifiedImpact": "e.g. 40% latency reduction / 100+ active users",
      "techStack": ["React", "TypeScript", "PostgreSQL"]
    }
  ]
}`;

  try {
    const { response, modelUsed } = await generateContentWithFallback({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json", temperature: 0.8 },
    });

    const parsed = JSON.parse(response.text ?? "{}");
    const bullets: ResumeBullet[] = Array.isArray(parsed.bullets) ? parsed.bullets.slice(0, 4) : [];

    const payload = {
      username: username.toLowerCase(),
      bullets,
      modelUsed,
      generatedAt: new Date().toISOString(),
    };

    await redisSet(cacheKey, JSON.stringify(payload), CACHE_TTL);
    return res.json(payload);
  } catch (err: any) {
    req.log?.warn({ err: err?.message || err, username }, "Gemini resume bullets failed — using fallback bullets");

    const fallbackBullets: ResumeBullet[] = [
      {
        repoName: topRepos[0] ?? "Flagship Project",
        bullet: `Architected a modular full-stack application using ${languages.slice(0, 2).join(" and ") || "modern TypeScript"}, establishing type-safe API contracts and reducing runtime defects by 35%.`,
        actionVerb: "Architected",
        quantifiedImpact: "35% defect reduction",
        techStack: languages.slice(0, 3),
      },
      {
        repoName: topRepos[1] ?? "Backend Service",
        bullet: "Engineered scalable RESTful API endpoints with structured request validation and automated caching, improving p95 query response latency by 45%.",
        actionVerb: "Engineered",
        quantifiedImpact: "45% latency improvement",
        techStack: ["Node.js", "Redis", "PostgreSQL"],
      },
      {
        repoName: "CI/CD & DevOps",
        bullet: "Automated continuous integration workflows utilizing GitHub Actions, executing automated test suites and linting across PRs to achieve 99.8% build pass rates.",
        actionVerb: "Automated",
        quantifiedImpact: "99.8% build reliability",
        techStack: ["GitHub Actions", "Docker", "Jest"],
      },
      {
        repoName: "Portfolio & Open Source",
        bullet: `Maintained an active open-source portfolio with clear documentation and live interactive demos, earning recognition across ${totalStars > 0 ? `${totalStars} GitHub stars` : "community developers"}.`,
        actionVerb: "Maintained",
        quantifiedImpact: `${totalStars > 0 ? totalStars : "Multiple"} community stars`,
        techStack: ["Open Source", "Documentation", "Git"],
      },
    ];

    const payload = {
      username: username.toLowerCase(),
      bullets: fallbackBullets,
      modelUsed: "fallback",
      generatedAt: new Date().toISOString(),
    };

    return res.json(payload);
  }
});

export default router;
