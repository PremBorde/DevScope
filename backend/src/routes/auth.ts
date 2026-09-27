import { Router, Request, Response, NextFunction } from "express";
import passport from "passport";
import crypto from "crypto";
import { logger } from "../lib/logger";
import { db, users } from "@workspace/db";
import { eq, or } from "drizzle-orm";

const router = Router();

export const OAUTH_ENABLED = !!(
  process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
);

const TOKEN_SECRET = process.env.SESSION_SECRET || "devscope-fallback-secret-key-32chars";

// In-memory fallback user cache for resilience
const userStore = new Map<string, any>();

// ── Password Hashing & Verification (PBKDF2/SHA-512 NIST Standard) ──────────
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, hash] = storedHash.split(":");
    if (!salt || !hash) return false;
    const computed = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(computed, "hex"));
  } catch {
    return false;
  }
}

// ── Token Management ────────────────────────────────────────────────────────
export function createAuthToken(user: any): string {
  const payload = JSON.stringify({
    id: user.id || `user_${user.username}`,
    githubId: String(user.githubId || user.id || ""),
    username: user.username,
    email: user.email || null,
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
      message: "GitHub OAuth is not configured on this server. Please use standard registration & login.",
    });
    return;
  }
  next();
}

/**
 * Helper to fetch public avatar from GitHub API or fall back to avatar URL
 */
async function fetchGithubProfileInfo(ghUsername: string) {
  const clean = ghUsername.trim().replace(/^@/, "");
  if (!clean) return null;
  try {
    const headers: Record<string, string> = {
      "User-Agent": "DevScope-AI-Platform/2.6",
      Accept: "application/vnd.github.v3+json",
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
    }
    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(clean)}`, { headers });
    if (res.ok) {
      const data = await res.json();
      return {
        githubId: String(data.id || ""),
        displayName: data.name || clean,
        avatarUrl: data.avatar_url || `https://github.com/${clean}.png`,
        profileUrl: data.html_url || `https://github.com/${clean}`,
      };
    }
  } catch {
    // fallback
  }
  return {
    githubId: `gh_${clean}`,
    displayName: clean,
    avatarUrl: `https://github.com/${clean}.png`,
    profileUrl: `https://github.com/${clean}`,
  };
}

// ── POST /api/auth/register ───────────────────────────────────────────────
// User Registration
router.post("/register", async (req: Request, res: Response) => {
  const { username, email, password, confirmPassword, githubUsername } = req.body as {
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    githubUsername?: string;
  };

  const cleanUsername = String(username ?? "").trim().toLowerCase();
  const cleanEmail = String(email ?? "").trim().toLowerCase();
  const rawPassword = String(password ?? "").trim();

  // 1. Validation
  if (!cleanUsername || cleanUsername.length < 3) {
    return res.status(400).json({
      error: "validation_error",
      message: "Username must be at least 3 characters long.",
    });
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
    return res.status(400).json({
      error: "validation_error",
      message: "Username can only contain alphanumeric characters, hyphens, and underscores.",
    });
  }
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({
      error: "validation_error",
      message: "Please provide a valid email address.",
    });
  }
  if (!rawPassword || rawPassword.length < 6) {
    return res.status(400).json({
      error: "validation_error",
      message: "Password must be at least 6 characters long.",
    });
  }
  if (confirmPassword && rawPassword !== String(confirmPassword).trim()) {
    return res.status(400).json({
      error: "validation_error",
      message: "Passwords do not match.",
    });
  }

  try {
    // 2. Check if username or email already registered
    let existingUser = null;
    try {
      const [dbUser] = await db
        .select()
        .from(users)
        .where(or(eq(users.username, cleanUsername), eq(users.email, cleanEmail)));
      existingUser = dbUser;
    } catch {
      // Memory fallback
      existingUser = Array.from(userStore.values()).find(
        (u) => u.username.toLowerCase() === cleanUsername || (u.email && u.email.toLowerCase() === cleanEmail)
      );
    }

    if (existingUser) {
      return res.status(409).json({
        error: "already_exists",
        message: "An account with this username or email already exists. Please sign in instead.",
      });
    }

    // 3. Resolve profile details (sync with GitHub if specified or if username matches)
    const ghTarget = githubUsername?.trim() || cleanUsername;
    const ghInfo = await fetchGithubProfileInfo(ghTarget);

    const passwordHash = hashPassword(rawPassword);
    const role = "developer";
    const permissions = [
      "roadmap:save",
      "interview:generate",
      "resume:generate",
      "badge:embed",
      "dashboard:history",
    ];

    let createdUser: any = null;
    try {
      const [newUser] = await db
        .insert(users)
        .values({
          username: cleanUsername,
          email: cleanEmail,
          passwordHash,
          githubId: ghInfo?.githubId || null,
          displayName: ghInfo?.displayName || cleanUsername,
          avatarUrl: ghInfo?.avatarUrl || `https://github.com/${cleanUsername}.png`,
          profileUrl: ghInfo?.profileUrl || `https://github.com/${cleanUsername}`,
          role,
        })
        .returning();
      createdUser = { ...newUser, permissions };
    } catch (err) {
      logger.warn({ err }, "Database user insert failed, using memory store");
      createdUser = {
        id: `usr_${cleanUsername}_${Date.now()}`,
        username: cleanUsername,
        email: cleanEmail,
        passwordHash,
        githubId: ghInfo?.githubId || null,
        displayName: ghInfo?.displayName || cleanUsername,
        avatarUrl: ghInfo?.avatarUrl || `https://github.com/${cleanUsername}.png`,
        profileUrl: ghInfo?.profileUrl || `https://github.com/${cleanUsername}`,
        role,
        permissions,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      userStore.set(cleanUsername, createdUser);
    }

    // 4. Issue session and JWT
    req.logIn(createdUser, (err) => {
      if (err) logger.warn({ err }, "Session login warning during registration");
    });

    const token = createAuthToken(createdUser);
    logger.info({ username: cleanUsername, email: cleanEmail }, "User registered successfully");

    return res.status(201).json({
      success: true,
      message: "Account registered successfully!",
      token,
      user: {
        id: createdUser.id,
        username: createdUser.username,
        email: createdUser.email,
        displayName: createdUser.displayName,
        avatarUrl: createdUser.avatarUrl,
        profileUrl: createdUser.profileUrl,
        role: createdUser.role,
        permissions,
      },
    });
  } catch (err: any) {
    logger.error({ err }, "Error during registration");
    return res.status(500).json({
      error: "registration_failed",
      message: err.message || "Failed to create account. Please try again.",
    });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────
// User Sign-In (with Username/Email & Password)
router.post("/login", async (req: Request, res: Response) => {
  const { identifier, password } = req.body as {
    identifier?: string;
    password?: string;
  };

  const cleanIdentifier = String(identifier ?? "").trim().toLowerCase();
  const rawPassword = String(password ?? "").trim();

  if (!cleanIdentifier) {
    return res.status(400).json({
      error: "validation_error",
      message: "Username or email is required.",
    });
  }
  if (!rawPassword) {
    return res.status(400).json({
      error: "validation_error",
      message: "Password is required.",
    });
  }

  try {
    let foundUser: any = null;
    try {
      const [dbUser] = await db
        .select()
        .from(users)
        .where(or(eq(users.username, cleanIdentifier), eq(users.email, cleanIdentifier)));
      foundUser = dbUser;
    } catch {
      foundUser = Array.from(userStore.values()).find(
        (u) =>
          u.username.toLowerCase() === cleanIdentifier ||
          (u.email && u.email.toLowerCase() === cleanIdentifier)
      );
    }

    if (!foundUser) {
      return res.status(401).json({
        error: "invalid_credentials",
        message: "No account found with this username or email. Please register first.",
      });
    }

    if (!foundUser.passwordHash) {
      return res.status(400).json({
        error: "oauth_account",
        message: "This account was registered via GitHub OAuth. Please sign in using GitHub.",
      });
    }

    // Verify Password
    const isValid = verifyPassword(rawPassword, foundUser.passwordHash);
    if (!isValid) {
      return res.status(401).json({
        error: "invalid_credentials",
        message: "Incorrect password. Please try again.",
      });
    }

    const role = foundUser.role || "developer";
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

    foundUser.permissions = permissions;

    req.logIn(foundUser, (err) => {
      if (err) logger.warn({ err }, "Session login warning during signin");
    });

    const token = createAuthToken(foundUser);
    logger.info({ username: foundUser.username }, "User signed in successfully");

    return res.json({
      success: true,
      message: "Signed in successfully!",
      token,
      user: {
        id: foundUser.id,
        username: foundUser.username,
        email: foundUser.email,
        displayName: foundUser.displayName,
        avatarUrl: foundUser.avatarUrl,
        profileUrl: foundUser.profileUrl,
        role: foundUser.role,
        permissions,
      },
    });
  } catch (err: any) {
    logger.error({ err }, "Error during login");
    return res.status(500).json({
      error: "login_failed",
      message: err.message || "Failed to sign in. Please try again.",
    });
  }
});

// ── POST /api/auth/signin/demo ────────────────────────────────────────────
// 1-Click Demo Profiles (For Recruiters / Quick Evaluation)
router.post("/signin/demo", async (req: Request, res: Response) => {
  const { username } = req.body as { username?: string };
  const target = String(username ?? "torvalds").toLowerCase();

  const DEMO_PROFILES: Record<string, any> = {
    torvalds: {
      githubId: "1024025",
      username: "torvalds",
      email: "torvalds@kernel.org",
      displayName: "Linus Torvalds",
      avatarUrl: "https://avatars.githubusercontent.com/u/1024025?v=4",
      profileUrl: "https://github.com/torvalds",
      role: "pro",
    },
    gaearon: {
      githubId: "810438",
      username: "gaearon",
      email: "dan@react.dev",
      displayName: "Dan Abramov",
      avatarUrl: "https://avatars.githubusercontent.com/u/810438?v=4",
      profileUrl: "https://github.com/gaearon",
      role: "developer",
    },
    shadcn: {
      githubId: "124599",
      username: "shadcn",
      email: "shadcn@ui.dev",
      displayName: "shadcn",
      avatarUrl: "https://avatars.githubusercontent.com/u/124599?v=4",
      profileUrl: "https://github.com/shadcn",
      role: "developer",
    },
  };

  const profile = DEMO_PROFILES[target] || DEMO_PROFILES.torvalds;
  const user = {
    id: `demo_${profile.username}`,
    ...profile,
    permissions: [
      "roadmap:save",
      "interview:generate",
      "resume:generate",
      "badge:embed",
      "dashboard:history",
    ],
  };

  req.logIn(user, (err) => {
    if (err) logger.warn({ err }, "Demo session warning");
  });

  const token = createAuthToken(user);
  logger.info({ username: user.username }, "Demo sign-in executed");

  return res.json({
    success: true,
    token,
    user,
  });
});

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
        email:       u.email || null,
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
          email:       tokenUser.email || null,
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
