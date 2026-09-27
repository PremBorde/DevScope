import { Router, Request, Response, NextFunction } from "express";
import { redisGet, redisSet } from "../config/redis";
import { AppError } from "../lib/errors";

const router = Router();
const inMemoryProgress = new Map<string, { checked: string[]; updatedAt: string }>();

function progressKey(username: string): string {
  return `roadmap-progress:${username.toLowerCase()}`;
}

// GET /api/ai/roadmap/progress/:username
router.get("/progress/:username", async (req: Request, res: Response, next: NextFunction) => {
  const rawParam = req.params.username;
  const usernameParam = Array.isArray(rawParam) ? rawParam[0] : rawParam;
  const username = String(usernameParam ?? "").trim();
  if (!username) {
    return next(new AppError(400, "validation_error", "Username is required"));
  }

  const key = progressKey(username);
  const raw = await redisGet(key);

  if (raw) {
    try {
      return res.json(JSON.parse(raw));
    } catch {
      // corrupt — fallback
    }
  }

  const mem = inMemoryProgress.get(username.toLowerCase());
  if (mem) {
    return res.json(mem);
  }

  return res.json({ username: username.toLowerCase(), checked: [], updatedAt: new Date().toISOString() });
});

// POST /api/ai/roadmap/progress/:username
router.post("/progress/:username", async (req: Request, res: Response, next: NextFunction) => {
  const rawParam = req.params.username;
  const usernameParam = Array.isArray(rawParam) ? rawParam[0] : rawParam;
  const username = String(usernameParam ?? "").trim();
  if (!username) {
    return next(new AppError(400, "validation_error", "Username is required"));
  }

  // Authorization check: If logged in, prevent modifying another developer's progress
  const authHeader = req.headers.authorization;
  if (req.isAuthenticated?.() || authHeader?.startsWith("Bearer ")) {
    const { resolveUser } = await import("../middleware/auth");
    const user = resolveUser(req);
    if (user && user.role !== "admin" && user.username.toLowerCase() !== username.toLowerCase()) {
      return res.status(403).json({
        error: "forbidden",
        message: `Forbidden: You are signed in as @${user.username} and cannot modify the roadmap of @${username}.`,
      });
    }
  }

  const { checked } = req.body as { checked: string[] };
  if (!Array.isArray(checked)) {
    return next(new AppError(400, "validation_error", "checked must be an array of task IDs"));
  }

  const payload = {
    username: username.toLowerCase(),
    checked,
    updatedAt: new Date().toISOString(),
  };

  const key = progressKey(username);
  await redisSet(key, JSON.stringify(payload), 60 * 60 * 24 * 30); // 30 days retention
  inMemoryProgress.set(username.toLowerCase(), payload);

  return res.json(payload);
});

export default router;
