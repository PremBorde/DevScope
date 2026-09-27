import { Router, Request, Response, NextFunction } from "express";
import passport from "passport";
import crypto from "crypto";
import { logger } from "../lib/logger";
import { db, users } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

export const OAUTH_ENABLED = !!(
  process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
);

const TOKEN_SECRET = process.env.SESSION_SECRET || "devscope-fallback-secret-key-32chars";

// In-memory fallback user cache for resilience
const userStore = new Map<string, any>();

export function createAuthToken(user: any): string {
  const payload = JSON.stringify({
    id: user.id || `user_${user.username}`,
    githubId: String(user.githubId || user.id || ""),
    username: user.username,
    displayName: user.displayName || null,
    avatarUrl: user.avatarUrl || null,
    profileUrl: user.profileUrl || `https://github.com/${user.username}`,
    role: user.role || "developer",
    permissions: user.permissions || [
      "roadmap:save",
      "interview:generate",
      "resume:generate",
      "badge:embed",
      "dashboard:history",
    ],
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
  const b64Payload = Buffer.from(payload).toString("base64url");
  const signature = crypto.createHmac("sha256", TOKEN_SECRET).update(b64Payload).digest("base64url");
  return `${b64Payload}.${signature}`;
}

export function verifyAuthToken(token: string) {
  try {
    const [b64Payload, signature] = token.split(".");
    if (!b64Payload || !signature) return null;
    const expected = crypto.createHmac("sha256", TOKEN_SECRET).update(b64Payload).digest("base64url");
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return null;
    }
    const data = JSON.parse(Buffer.from(b64Payload, "base64url").toString());
    if (data.exp && data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

function getSpaBase(req: Request): string {
  if (process.env.FRONTEND_URL?.trim()) {
    return process.env.FRONTEND_URL.trim().replace(/\/+$/, "");
  }
  const sessionOrigin = (req.session as any)?.returnOrigin;
  if (sessionOrigin) return sessionOrigin;
  if (req.headers.referer) {
    try {
      return new URL(req.headers.referer).origin;
    } catch {
      // ignore
    }
  }
  return "";
}

function spaRedirect(req: Request, pathWithQuery: string): string {
  const base = getSpaBase(req);
  const p = pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`;
  return base ? `${base}${p}` : p;
}

function requireOAuth(req: Request, res: Response, next: NextFunction): void {
  if (!OAUTH_ENABLED) {
    res.status(503).json({
      error: "oauth_disabled",
      message: "GitHub OAuth is not configured on this server. Use instant Developer Sign-In instead.",
    });
    return;
  }
  next();
}

/**
 * Upserts user in database with fallback to in-memory store
 */
async function persistUser(userData: {
  githubId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  profileUrl: string | null;
  role?: "developer" | "pro" | "admin";
}) {
  const role = userData.role || "developer";
  const permissions =
    role === "pro" || role === "admin"
      ? [
          "roadmap:save",
          "interview:generate",
          "resume:generate",
          "badge:embed",
          "dashboard:history",
          "pro:unlimited_ai",
          "pro:private_repos",
        ]
      : [
          "roadmap:save",
          "interview:generate",
          "resume:generate",
          "badge:embed",
          "dashboard:history",
        ];

  try {
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.githubId, userData.githubId));

    if (existing) {
      const [updated] = await db
        .update(users)
        .set({
          username: userData.username,
          displayName: userData.displayName,
          avatarUrl: userData.avatarUrl,
          profileUrl: userData.profileUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.githubId, userData.githubId))
        .returning();

      return { ...updated, role, permissions };
    }

    const [created] = await db
      .insert(users)
      .values({
        githubId: userData.githubId,
        username: userData.username,
        displayName: userData.displayName,
        avatarUrl: userData.avatarUrl,
        profileUrl: userData.profileUrl,
      })
      .returning();

    return { ...created, role, permissions };
  } catch (err) {
    logger.warn({ err }, "Database user upsert failed, using memory fallback");
    const memUser = {
      id: `usr_${userData.githubId}`,
      ...userData,
      role,
      permissions,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    userStore.set(userData.username.toLowerCase(), memUser);
    return memUser;
  }
}

// ── GET /api/auth/me ──────────────────────────────────────────────────────
router.get("/me", (req: Request, res: Response) => {
  // 1. Check Passport session (cookie)
  if (req.isAuthenticated() && req.user) {
    const u = req.user as any;
    return res.json({
      user: {
        id:          u.id,
        githubId:    u.githubId,
        username:    u.username,
        displayName: u.displayName || null,
        avatarUrl:   u.avatarUrl || null,
        profileUrl:  u.profileUrl || `https://github.com/${u.username}`,
        role:        u.role || "developer",
        permissions: u.permissions || [
          "roadmap:save",
          "interview:generate",
          "resume:generate",
          "badge:embed",
          "dashboard:history",
        ],
      },
      oauthEnabled: OAUTH_ENABLED,
    });
  }

  // 2. Check Authorization: Bearer token header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    const tokenUser = verifyAuthToken(token);
    if (tokenUser) {
      return res.json({
        user: {
          id:          tokenUser.id,
          githubId:    tokenUser.githubId,
          username:    tokenUser.username,
          displayName: tokenUser.displayName,
          avatarUrl:   tokenUser.avatarUrl,
          profileUrl:  tokenUser.profileUrl,
          role:        tokenUser.role || "developer",
          permissions: tokenUser.permissions || [
            "roadmap:save",
            "interview:generate",
            "resume:generate",
            "badge:embed",
            "dashboard:history",
          ],
        },
        oauthEnabled: OAUTH_ENABLED,
      });
    }
  }

  return res.json({ user: null, oauthEnabled: OAUTH_ENABLED });
});

// ── POST /api/auth/signin/developer ───────────────────────────────────────
// Authenticate developer by verified GitHub username
router.post("/signin/developer", async (req: Request, res: Response) => {
  const { username } = req.body as { username?: string };
  const cleanUsername = String(username ?? "").trim().replace(/^@/, "");

  if (!cleanUsername) {
    return res.status(400).json({ error: "validation_error", message: "GitHub username is required" });
  }

  try {
    // Verify against GitHub Public API
    const headers: Record<string, string> = {
      "User-Agent": "DevScope-AI-Platform/2.6",
      Accept: "application/vnd.github.v3+json",
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
    }

    const ghRes = await fetch(`https://api.github.com/users/${encodeURIComponent(cleanUsername)}`, {
      headers,
    });

    if (ghRes.status === 404) {
      return res.status(404).json({
        error: "user_not_found",
        message: `GitHub user "@${cleanUsername}" does not exist. Please check the spelling.`,
      });
    }

    if (!ghRes.ok) {
      logger.warn({ status: ghRes.status }, "GitHub API check error during developer signin");
      // If rate limited, fallback to formatted synthetic profile
    }

    const ghData = ghRes.ok
      ? await ghRes.json()
      : {
          id: `gh_${cleanUsername}`,
          login: cleanUsername,
          name: cleanUsername,
          avatar_url: `https://github.com/${cleanUsername}.png`,
          html_url: `https://github.com/${cleanUsername}`,
        };

    const user = await persistUser({
      githubId: String(ghData.id || `gh_${cleanUsername}`),
      username: ghData.login || cleanUsername,
      displayName: ghData.name || null,
      avatarUrl: ghData.avatar_url || `https://github.com/${cleanUsername}.png`,
      profileUrl: ghData.html_url || `https://github.com/${cleanUsername}`,
      role: "developer",
    });

    req.logIn(user, (err) => {
      if (err) logger.warn({ err }, "Passport session logIn warning");
    });

    const token = createAuthToken(user);
    logger.info({ username: user.username }, "Developer sign-in successful");

    return res.json({
      success: true,
      token,
      user,
    });
  } catch (err: any) {
    logger.error({ err }, "Error during developer sign-in");
    return res.status(500).json({
      error: "signin_failed",
      message: err.message || "Failed to sign in developer account",
    });
  }
});

// ── POST /api/auth/signin/pat ─────────────────────────────────────────────
// Authenticate using a GitHub Personal Access Token (PAT) for Pro tier
router.post("/signin/pat", async (req: Request, res: Response) => {
  const { pat } = req.body as { pat?: string };
  const token = String(pat ?? "").trim();

  if (!token) {
    return res.status(400).json({ error: "validation_error", message: "Personal Access Token is required" });
  }

  try {
    const ghRes = await fetch("https://api.github.com/user", {
      headers: {
        "User-Agent": "DevScope-AI-Platform/2.6",
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (ghRes.status === 401) {
      return res.status(401).json({
        error: "invalid_token",
        message: "The provided GitHub Personal Access Token is invalid or expired.",
      });
    }

    if (!ghRes.ok) {
      return res.status(502).json({
        error: "github_error",
        message: "Unable to verify token with GitHub API.",
      });
    }

    const ghUser = await ghRes.json();
    const user = await persistUser({
      githubId: String(ghUser.id),
      username: ghUser.login,
      displayName: ghUser.name || null,
      avatarUrl: ghUser.avatar_url,
      profileUrl: ghUser.html_url,
      role: "pro", // Elevated Pro Tier
    });

    req.logIn(user, (err) => {
      if (err) logger.warn({ err }, "Passport session logIn warning");
    });

    const authToken = createAuthToken(user);
    logger.info({ username: user.username, role: "pro" }, "Pro PAT sign-in successful");

    return res.json({
      success: true,
      token: authToken,
      user,
    });
  } catch (err: any) {
    logger.error({ err }, "Error during PAT sign-in");
    return res.status(500).json({ error: "pat_failed", message: "Failed to verify Personal Access Token" });
  }
});

// ── POST /api/auth/signin/demo ────────────────────────────────────────────
// Instant demo login for recruiters & testers
router.post("/signin/demo", async (req: Request, res: Response) => {
  const { username } = req.body as { username?: string };
  const target = String(username ?? "torvalds").toLowerCase();

  const DEMO_PROFILES: Record<string, any> = {
    torvalds: {
      githubId: "1024025",
      username: "torvalds",
      displayName: "Linus Torvalds",
      avatarUrl: "https://avatars.githubusercontent.com/u/1024025?v=4",
      profileUrl: "https://github.com/torvalds",
      role: "pro",
    },
    gaearon: {
      githubId: "810438",
      username: "gaearon",
      displayName: "Dan Abramov",
      avatarUrl: "https://avatars.githubusercontent.com/u/810438?v=4",
      profileUrl: "https://github.com/gaearon",
      role: "developer",
    },
    shadcn: {
      githubId: "124599",
      username: "shadcn",
      displayName: "shadcn",
      avatarUrl: "https://avatars.githubusercontent.com/u/124599?v=4",
      profileUrl: "https://github.com/shadcn",
      role: "developer",
    },
  };

  const profile = DEMO_PROFILES[target] || DEMO_PROFILES.torvalds;
  const user = await persistUser(profile);

  req.logIn(user, (err) => {
    if (err) logger.warn({ err }, "Passport session logIn warning");
  });

  const token = createAuthToken(user);
  logger.info({ username: user.username }, "Demo sign-in executed");

  return res.json({
    success: true,
    token,
    user,
  });
});

// ── GET /api/auth/github ───────────────────────────────────────────────────
router.get(
  "/github",
  requireOAuth,
  (req: Request, res: Response, next: NextFunction) => {
    if (req.headers.referer) {
      try {
        const origin = new URL(req.headers.referer).origin;
        (req.session as any).returnOrigin = origin;
      } catch {
        // ignore
      }
    }
    passport.authenticate("github", { scope: ["read:user", "user:email"] })(req, res, next);
  }
);

// ── GET /api/auth/github/callback ─────────────────────────────────────────
router.get(
  "/github/callback",
  requireOAuth,
  (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("github", async (err: any, user: any) => {
      if (err || !user) {
        logger.warn({ err }, "GitHub OAuth authentication failed");
        return res.redirect(spaRedirect(req, "/?auth=error"));
      }

      req.logIn(user, (loginErr) => {
        if (loginErr) {
          logger.error({ err: loginErr }, "Error logging in user after OAuth callback");
          return res.redirect(spaRedirect(req, "/?auth=error"));
        }

        const token = createAuthToken(user);
        logger.info({ username: user.username }, "GitHub OAuth success — issuing token & session");
        return res.redirect(spaRedirect(req, `/?auth=success&token=${encodeURIComponent(token)}`));
      });
    })(req, res, next);
  }
);

// ── POST /api/auth/logout ─────────────────────────────────────────────────
router.post("/logout", (req: Request, res: Response) => {
  const username = req.user?.username ?? "anonymous";
  req.logout((err) => {
    if (err) {
      logger.error({ err }, "Logout error");
      res.status(500).json({ error: "logout_failed" });
      return;
    }
    req.session.destroy(() => {
      res.clearCookie("sid");
      logger.info({ username }, "User logged out");
      res.json({ success: true });
    });
  });
});

export default router;
