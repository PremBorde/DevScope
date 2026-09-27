import { Request, Response, NextFunction } from "express";
import { verifyAuthToken } from "../routes/auth";
import { AppError } from "../lib/errors";

export interface AuthenticatedUser {
  id: string;
  githubId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  profileUrl: string | null;
  role: "developer" | "pro" | "admin";
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      authenticatedUser?: AuthenticatedUser | null;
    }
  }
}

/**
 * Resolves the authenticated user from either the session cookie or the Authorization: Bearer <token> header.
 */
export function resolveUser(req: Request): AuthenticatedUser | null {
  // 1. Check Passport session (cookie)
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    const u = req.user as any;
    return {
      id: u.id || `user_${u.username}`,
      githubId: String(u.githubId || u.id || ""),
      username: u.username,
      displayName: u.displayName || null,
      avatarUrl: u.avatarUrl || null,
      profileUrl: u.profileUrl || `https://github.com/${u.username}`,
      role: u.role || "developer",
      permissions: u.permissions || [
        "roadmap:save",
        "interview:generate",
        "resume:generate",
        "badge:embed",
        "dashboard:history",
      ],
    };
  }

  // 2. Check Authorization header: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    const tokenData = verifyAuthToken(token);
    if (tokenData) {
      return {
        id: tokenData.id || `user_${tokenData.username}`,
        githubId: String(tokenData.githubId || ""),
        username: tokenData.username,
        displayName: tokenData.displayName || null,
        avatarUrl: tokenData.avatarUrl || null,
        profileUrl: tokenData.profileUrl || `https://github.com/${tokenData.username}`,
        role: tokenData.role || "developer",
        permissions: tokenData.permissions || [
          "roadmap:save",
          "interview:generate",
          "resume:generate",
          "badge:embed",
          "dashboard:history",
        ],
      };
    }
  }

  return null;
}

/**
 * Optional authentication: Attaches user to `req.authenticatedUser` if valid credentials exist.
 */
export function attachUser(req: Request, _res: Response, next: NextFunction): void {
  req.authenticatedUser = resolveUser(req);
  next();
}

/**
 * Mandatory authentication: Rejects unauthenticated requests with 401 Unauthorized.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const user = resolveUser(req);
  if (!user) {
    res.status(401).json({
      error: "unauthorized",
      message: "Authentication required. Please sign in to access this feature.",
    });
    return;
  }
  req.authenticatedUser = user;
  next();
}

/**
 * Role-Based Access Control (RBAC): Enforces role requirement.
 */
export function requireRole(allowedRoles: ("developer" | "pro" | "admin")[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = resolveUser(req);
    if (!user) {
      res.status(401).json({
        error: "unauthorized",
        message: "Authentication required.",
      });
      return;
    }
    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({
        error: "forbidden",
        message: `Forbidden: Requires one of [${allowedRoles.join(", ")}] roles. Current role: ${user.role}`,
      });
      return;
    }
    req.authenticatedUser = user;
    next();
  };
}

/**
 * Ownership authorization: User must be the owner of the resource or an admin.
 */
export function requireOwnerOrAdmin(paramKey = "username") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = resolveUser(req);
    if (!user) {
      res.status(401).json({
        error: "unauthorized",
        message: "Authentication required to modify this resource.",
      });
      return;
    }

    const rawParam = req.params[paramKey];
    const targetUsername = (Array.isArray(rawParam) ? rawParam[0] : rawParam)?.toLowerCase();

    if (user.role !== "admin" && user.username.toLowerCase() !== targetUsername) {
      res.status(403).json({
        error: "forbidden",
        message: `Forbidden: You can only modify your own profile (@${user.username}). Cannot modify @${targetUsername}.`,
      });
      return;
    }

    req.authenticatedUser = user;
    next();
  };
}
