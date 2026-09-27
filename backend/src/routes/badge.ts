import { Router, Request, Response } from "express";
import { db, analysesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { analyzeUser } from "../services/analyze.service";

const router = Router();

function getGrade(score: number): { grade: string; color: string; bg: string } {
  if (score >= 90) return { grade: "Tier S (Exceptional)", color: "#059669", bg: "#10B981" };
  if (score >= 80) return { grade: "Tier A (Strong Hire)", color: "#16A34A", bg: "#22C55E" };
  if (score >= 70) return { grade: "Tier B (Hire)", color: "#D97706", bg: "#F59E0B" };
  if (score >= 50) return { grade: "Tier C (Consider)", color: "#EA580C", bg: "#FB923C" };
  return { grade: "Tier D (Developing)", color: "#DC2626", bg: "#EF4444" };
}

// GET /api/badge/:username.svg
router.get("/:username.svg", async (req: Request, res: Response) => {
  const rawParam = req.params.username;
  const usernameParam = Array.isArray(rawParam) ? rawParam[0] : rawParam;
  const username = String(usernameParam ?? "").replace(/\.svg$/, "").trim();

  let score = 70;
  try {
    // Check if we have recent analysis in DB
    const [latest] = await db
      .select({ score: analysesTable.score })
      .from(analysesTable)
      .where(eq(analysesTable.username, username))
      .orderBy(desc(analysesTable.analyzedAt))
      .limit(1);

    if (latest?.score) {
      score = Math.round(Number(latest.score));
    } else {
      const data = await analyzeUser(username);
      score = Math.round(data.scoreBreakdown.total);
    }
  } catch {
    score = 70; // safe fallback
  }

  const { grade, color, bg } = getGrade(score);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="48" viewBox="0 0 340 48" role="img" aria-label="DevScope Score: ${score}/100">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#18181B" />
      <stop offset="100%" stop-color="#27272A" />
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="115%">
      <feDropShadow dx="2" dy="2" stdDeviation="0" flood-color="#000000" />
    </filter>
  </defs>
  <!-- Background with brutalist stroke and hard shadow -->
  <rect x="2" y="2" width="334" height="42" rx="4" fill="url(#grad)" stroke="#000000" stroke-width="2.5" filter="url(#shadow)" />

  <!-- Logo Mark -->
  <g transform="translate(14, 13)">
    <rect width="22" height="22" rx="3" fill="#FF8D3F" stroke="#000000" stroke-width="1.5" />
    <text x="11" y="16" fill="#000000" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="900" text-anchor="middle">🎯</text>
  </g>

  <!-- Left Text: Brand & Username -->
  <text x="44" y="27" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="800" letter-spacing="0.5">
    DEVSCOPE AI <tspan fill="#A1A1AA" font-weight="500">| @${username}</tspan>
  </text>

  <!-- Score Badge Pill -->
  <g transform="translate(230, 9)">
    <rect width="94" height="28" rx="3" fill="${bg}" stroke="#000000" stroke-width="1.5" />
    <text x="47" y="19" fill="#000000" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="900" text-anchor="middle" letter-spacing="0.5">
      ${score}/100 ★
    </text>
  </g>
</svg>`.trim();

  res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
  return res.status(200).send(svg);
});

export default router;
