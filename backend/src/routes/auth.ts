import { Router, Request, Response, NextFunction } from "express";
import passport from "passport";
import crypto from "crypto";
import { logger } from "../lib/logger";

const router = Router();

const OAUTH_ENABLED = !!(
  process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
);

const TOKEN_SECRET = process.env.SESSION_SECRET || "devscope-fallback-secret-key-32chars";

export function createAuthToken(user: any): string {
  const payload = JSON.stringify({
    id: user.id,
    githubId: user.githubId,
    username: user.username,
    displayName: user.displayName || null,
    avatarUrl: user.avatarUrl || null,
    profileUrl: user.profileUrl || null,
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
      message: "GitHub OAuth is not configured on this server.",
    });
    return;
  }
  next();
}

// ── GET /api/auth/github ───────────────────────────────────────────────────
// Redirect user to GitHub for authorisation
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
// GitHub redirects here after authorisation
router.get(
  "/github/callback",
  requireOAuth,
  (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("github", (err: any, user: any) => {
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

// ── GET /api/auth/me ──────────────────────────────────────────────────────
// Returns the currently authenticated user (or null)
router.get("/me", (req: Request, res: Response) => {
  // 1. Check Passport session (cookie)
  if (req.isAuthenticated() && req.user) {
    return res.json({
      user: {
        githubId:    req.user.githubId,
        username:    req.user.username,
        displayName: req.user.displayName,
        avatarUrl:   req.user.avatarUrl,
        profileUrl:  req.user.profileUrl,
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
          githubId:    tokenUser.githubId,
          username:    tokenUser.username,
          displayName: tokenUser.displayName,
          avatarUrl:   tokenUser.avatarUrl,
          profileUrl:  tokenUser.profileUrl,
        },
        oauthEnabled: OAUTH_ENABLED,
      });
    }
  }

  return res.json({ user: null, oauthEnabled: OAUTH_ENABLED });
});

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
