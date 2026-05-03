import { Request, Response, NextFunction } from "express";
import { AppError } from "../lib/errors";

/**
 * GitHub username rules:
 *  - 1–39 characters
 *  - Alphanumeric and hyphens only
 *  - Cannot start or end with a hyphen
 *  - No consecutive hyphens (GitHub's actual rule)
 */
const GITHUB_USERNAME_RE =
  /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$|^[a-zA-Z0-9]$/;

/**
 * Returns middleware that validates a username path param.
 * Normalises it to lowercase on req.params after passing.
 *
 * @example  router.get("/:username", validateUsername(), handler)
 */
export function validateUsername(paramName = "username") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const raw = ((req.params[paramName] as string) ?? "").trim();

    if (!raw) {
      next(new AppError(400, "validation_error", "Username is required"));
      return;
    }
    if (raw.length > 39) {
      next(new AppError(400, "validation_error", "Username must be 39 characters or fewer"));
      return;
    }
    if (!GITHUB_USERNAME_RE.test(raw)) {
      next(
        new AppError(
          400,
          "validation_error",
          "Invalid GitHub username. Use only letters, numbers, and hyphens (no leading/trailing hyphens).",
        ),
      );
      return;
    }
    if (/--/.test(raw)) {
      next(new AppError(400, "validation_error", "GitHub usernames cannot contain consecutive hyphens"));
      return;
    }

    req.params[paramName] = raw.toLowerCase();
    next();
  };
}
