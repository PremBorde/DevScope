import { Router, Request, Response, NextFunction } from "express";
import { generateContentWithFallback } from "@workspace/integrations-gemini-ai";
import { redisGet, redisSet } from "../config/redis";
import { AppError } from "../lib/errors";

const router = Router();
const CACHE_TTL = 60 * 60 * 24 * 3; // 3 days

interface InterviewQuestion {
  question: string;
  contextRepo: string;
  signalsLookedFor: string;
  sampleAnswerTips: string;
  difficulty: "junior" | "mid" | "senior" | "staff";
}

// POST /api/ai/interview-prep
router.post("/interview-prep", async (req: Request, res: Response, next: NextFunction) => {
  const { username, topRepos = [], languages = [], score = 70 } = req.body as {
    username: string;
    topRepos?: string[];
    languages?: string[];
    score?: number;
  };

  if (!username || typeof username !== "string") {
    return next(new AppError(400, "validation_error", "Username is required"));
  }

  const cacheKey = `interview-prep:${username.toLowerCase()}`;
  const cached = await redisGet(cacheKey);
  if (cached) {
    try {
      return res.json(JSON.parse(cached));
    } catch {
      // corrupt — continue
    }
  }

  const prompt = `You are a Staff Technical Recruiter and Hiring Bar Raiser at a top tier technology company (Google/Stripe/Meta caliber).
You are evaluating the GitHub portfolio of candidate @${username}.
Candidate Details:
- DevScope Rating: ${score}/100
- Top Repositories: ${topRepos.join(", ") || "General projects"}
- Core Languages: ${languages.join(", ") || "TypeScript, Python, JavaScript"}

TASK:
Generate 4 highly specific technical interview questions that you would ask this candidate in a real technical interview screen.
The questions MUST reference their actual technologies and projects. Don't ask generic trivia ("what is a closure"). Ask architectural, debugging, trade-off, and scalability questions based on their work.

Return ONLY a valid JSON object in this exact shape:
{
  "questions": [
    {
      "question": "The exact interview question you will ask",
      "contextRepo": "Name of relevant repo or skill area",
      "signalsLookedFor": "What the interviewer is evaluating in their response",
      "sampleAnswerTips": "Key architectural talking points the candidate should mention",
      "difficulty": "mid" // "junior" | "mid" | "senior" | "staff"
    }
  ]
}`;

  try {
    const { response, modelUsed } = await generateContentWithFallback({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json", temperature: 0.8 },
    });

    const parsed = JSON.parse(response.text ?? "{}");
    const questions: InterviewQuestion[] = Array.isArray(parsed.questions) ? parsed.questions.slice(0, 4) : [];

    const payload = {
      username: username.toLowerCase(),
      questions,
      modelUsed,
      generatedAt: new Date().toISOString(),
    };

    await redisSet(cacheKey, JSON.stringify(payload), CACHE_TTL);
    return res.json(payload);
  } catch (err: any) {
    req.log?.warn({ err: err?.message || err, username }, "Gemini interview prep failed — using fallback questions");

    const fallbackQuestions: InterviewQuestion[] = [
      {
        question: `In your main repository ${topRepos[0] ?? "project"}, how do you manage state transitions and error boundaries under unexpected API failure?`,
        contextRepo: topRepos[0] ?? "Core Repository",
        signalsLookedFor: "Resilience, defensive programming, and user-facing graceful degradation.",
        sampleAnswerTips: "Discuss retry policies with exponential backoff, circuit breaking, and typed error handling.",
        difficulty: "mid",
      },
      {
        question: `Looking at your stack in ${languages.slice(0, 2).join(" & ") || "TypeScript"}, what performance bottlenecks did you encounter as data volume or concurrency grew?`,
        contextRepo: "Architecture & Performance",
        signalsLookedFor: "Profiling ability, memory leak awareness, and database connection pooling.",
        sampleAnswerTips: "Mention flamegraphs or profiling tools, query indexing, and caching read-heavy endpoints.",
        difficulty: "senior",
      },
      {
        question: "How do you ensure automated test coverage and maintainability without slowing down feature velocity?",
        contextRepo: "CI/CD & Testing",
        signalsLookedFor: "Testing philosophy (unit vs integration vs e2e) and continuous integration discipline.",
        sampleAnswerTips: "Talk about testing key business paths first, mocking external I/O, and fast CI feedback loops.",
        difficulty: "mid",
      },
      {
        question: "If you had to scale this codebase to handle 100x user traffic tomorrow, which component would break first and how would you re-architect it?",
        contextRepo: "System Scaling",
        signalsLookedFor: "System design intuition, decoupled architectures, and queueing/caching patterns.",
        sampleAnswerTips: "Point out synchronous bottlenecks, decompose monolithic database operations, and introduce asynchronous message queues.",
        difficulty: "staff",
      },
    ];

    const payload = {
      username: username.toLowerCase(),
      questions: fallbackQuestions,
      modelUsed: "fallback",
      generatedAt: new Date().toISOString(),
    };

    return res.json(payload);
  }
});

export default router;
