import { Router, Request, Response, NextFunction } from "express";
import passport from "passport";
import { logger } from "../lib/logger";

const router = Router();

const OAUTH_ENABLED = !!(
  process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
);

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
  passport.authenticate("github", { scope: ["read:user", "user:email"] })
);

// ── GET /api/auth/github/callback ─────────────────────────────────────────
// GitHub redirects here after authorisation
router.get(
  "/github/callback",
  requireOAuth,
  passport.authenticate("github", { failureRedirect: "/?auth=error" }),
  (_req: Request, res: Response) => {
    // Successful login — send user back to the SPA
    res.redirect("/?auth=success");
  }
);

// ── GET /api/auth/me ──────────────────────────────────────────────────────
// Returns the currently authenticated user (or null)
router.get("/me", (req: Request, res: Response) => {
  if (req.isAuthenticated() && req.user) {
    res.json({
      user: {
        githubId:    req.user.githubId,
        username:    req.user.username,
        displayName: req.user.displayName,
        avatarUrl:   req.user.avatarUrl,
        profileUrl:  req.user.profileUrl,
      },
      oauthEnabled: OAUTH_ENABLED,
    });
  } else {
    res.json({ user: null, oauthEnabled: OAUTH_ENABLED });
  }
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
