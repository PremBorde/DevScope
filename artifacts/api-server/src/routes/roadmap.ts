import { Router, Request, Response } from "express";
import { db, analysesTable } from "@workspace/db";
import { ai } from "@workspace/integrations-gemini-ai";
import { eq, desc } from "drizzle-orm";

const router = Router();

interface RoadmapAction {
  text: string;
  priority: "high" | "medium" | "low";
  category: string;
}

interface RoadmapPhase {
  label: string;
  timeframe: string;
  actions: RoadmapAction[];
}

interface Roadmap {
  username: string;
  score: number;
  immediate: RoadmapPhase;
  shortTerm: RoadmapPhase;
  midTerm: RoadmapPhase;
  longTerm: RoadmapPhase;
  generatedAt: string;
}

async function generateRoadmap(
  username: string,
  score: number,
  scoreBreakdown: Record<string, number>,
  aiInsights: { strengths: string[]; weaknesses: string[]; suggestions: string[] },
  repoStats: Record<string, unknown>
): Promise<Omit<Roadmap, "username" | "score" | "generatedAt">> {
  const prompt = `You are a senior software engineering mentor. A developer's GitHub profile was scored ${score}/100.

Score breakdown:
- Repo Quality: ${scoreBreakdown.repoQuality ?? "??"}/30
- Activity: ${scoreBreakdown.activityConsistency ?? "??"}/25
- Tech Diversity: ${scoreBreakdown.techDiversity ?? "??"}/20
- Popularity: ${scoreBreakdown.popularity ?? "??"}/15
- Completeness: ${scoreBreakdown.completeness ?? "??"}/10

Strengths: ${aiInsights.strengths.join("; ")}
Weaknesses: ${aiInsights.weaknesses.join("; ")}
Suggestions: ${aiInsights.suggestions.join("; ")}
Repo stats: ${JSON.stringify(repoStats)}

Generate a PERSONALIZED, SPECIFIC, ACTIONABLE improvement roadmap. Reference their actual numbers and weaknesses.
Each action must be a SHORT bullet (max 12 words). No generic advice. Be direct.

Return ONLY valid JSON:
{
  "immediate": {
    "label": "Immediate Actions",
    "timeframe": "This week",
    "actions": [
      { "text": "specific action here", "priority": "high", "category": "documentation" },
      { "text": "specific action here", "priority": "high", "category": "profile" },
      { "text": "specific action here", "priority": "medium", "category": "repositories" }
    ]
  },
  "shortTerm": {
    "label": "Short-Term",
    "timeframe": "1–2 weeks",
    "actions": [
      { "text": "specific action here", "priority": "high", "category": "projects" },
      { "text": "specific action here", "priority": "medium", "category": "deployment" },
      { "text": "specific action here", "priority": "medium", "category": "visibility" }
    ]
  },
  "midTerm": {
    "label": "Mid-Term",
    "timeframe": "2–4 weeks",
    "actions": [
      { "text": "specific action here", "priority": "medium", "category": "open-source" },
      { "text": "specific action here", "priority": "medium", "category": "quality" },
      { "text": "specific action here", "priority": "low", "category": "networking" }
    ]
  },
  "longTerm": {
    "label": "Long-Term",
    "timeframe": "1–3 months",
    "actions": [
      { "text": "specific action here", "priority": "medium", "category": "flagship" },
      { "text": "specific action here", "priority": "low", "category": "community" },
      { "text": "specific action here", "priority": "low", "category": "branding" }
    ]
  }
}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 4096, responseMimeType: "application/json" },
    });
    const parsed = JSON.parse(response.text ?? "{}");

    const ensurePhase = (p: unknown, label: string, timeframe: string): RoadmapPhase => {
      const phase = p as Partial<RoadmapPhase> | undefined;
      return {
        label: phase?.label ?? label,
        timeframe: phase?.timeframe ?? timeframe,
        actions: Array.isArray(phase?.actions)
          ? phase!.actions.map((a: Partial<RoadmapAction>) => ({
              text: a.text ?? "",
              priority: (["high", "medium", "low"].includes(a.priority ?? "")) ? a.priority! : "medium",
              category: a.category ?? "general",
            }))
          : [],
      };
    };

    return {
      immediate: ensurePhase(parsed.immediate, "Immediate Actions", "This week"),
      shortTerm: ensurePhase(parsed.shortTerm, "Short-Term", "1–2 weeks"),
      midTerm:   ensurePhase(parsed.midTerm,   "Mid-Term",    "2–4 weeks"),
      longTerm:  ensurePhase(parsed.longTerm,  "Long-Term",   "1–3 months"),
    };
  } catch {
    // Deterministic fallback based on score
    const low = score < 50;
    const mid = score < 70;
    return {
      immediate: {
        label: "Immediate Actions",
        timeframe: "This week",
        actions: [
          { text: "Add detailed README to your top 3 repositories", priority: "high", category: "documentation" },
          { text: "Fill in GitHub profile bio and location", priority: "high", category: "profile" },
          { text: "Add descriptions to all public repos", priority: "high", category: "repositories" },
        ],
      },
      shortTerm: {
        label: "Short-Term",
        timeframe: "1–2 weeks",
        actions: [
          { text: low ? "Build a full-stack project with auth and database" : "Polish your best project with tests and CI", priority: "high", category: "projects" },
          { text: "Deploy a live project on Vercel or Render", priority: "medium", category: "deployment" },
          { text: mid ? "Add screenshots/demos to your top repos" : "Write a technical blog post about a project", priority: "medium", category: "visibility" },
        ],
      },
      midTerm: {
        label: "Mid-Term",
        timeframe: "2–4 weeks",
        actions: [
          { text: "Submit 2 pull requests to popular open-source repos", priority: "medium", category: "open-source" },
          { text: "Add code comments and improve folder structure", priority: "medium", category: "quality" },
          { text: "Share a project on Reddit or Hacker News", priority: "low", category: "networking" },
        ],
      },
      longTerm: {
        label: "Long-Term",
        timeframe: "1–3 months",
        actions: [
          { text: "Build a flagship project that solves a real problem", priority: "medium", category: "flagship" },
          { text: "Maintain a consistent daily commit streak", priority: "medium", category: "activity" },
          { text: "Grow GitHub followers by engaging with the community", priority: "low", category: "branding" },
        ],
      },
    };
  }
}

// GET /roadmap/:username
router.get("/:username", async (req: Request, res: Response) => {
  const username = (req.params.username as string)?.trim().toLowerCase();
  if (!username) {
    res.status(400).json({ error: "validation_error", message: "Username is required" });
    return;
  }

  try {
    // Fetch the latest analysis for this user from the DB
    const [latest] = await db
      .select()
      .from(analysesTable)
      .where(eq(analysesTable.username, username))
      .orderBy(desc(analysesTable.analyzedAt))
      .limit(1);

    if (!latest) {
      res.status(404).json({
        error: "not_found",
        message: `No analysis found for '${username}'. Analyze the profile first.`,
      });
      return;
    }

    const scoreBreakdown = latest.scoreBreakdownJson as Record<string, number>;
    const aiInsights = latest.aiInsightsJson as {
      strengths: string[];
      weaknesses: string[];
      suggestions: string[];
    };
    const repoStats = latest.repoStatsJson as Record<string, unknown>;
    const score = Number(latest.score);

    const phases = await generateRoadmap(username, score, scoreBreakdown, aiInsights, repoStats);

    const roadmap: Roadmap = {
      username,
      score,
      ...phases,
      generatedAt: new Date().toISOString(),
    };

    res.json(roadmap);
  } catch (err) {
    req.log?.error({ err }, "Failed to generate roadmap");
    res.status(500).json({ error: "internal_error", message: "Failed to generate roadmap" });
  }
});

export default router;
