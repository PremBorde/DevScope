import { Request, Response, NextFunction } from "express";
import { AppError } from "../lib/errors";

const isProd = process.env.NODE_ENV === "production";

/**
 * Global Express error handler — must be registered LAST (after all routes).
 * Converts AppError instances to clean JSON responses.
 * Treats unknown errors as 500 and hides internals in production.
 */
export function globalErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    if (err.status >= 500) {
      req.log?.error({ err, code: err.code }, err.message);
    } else {
      req.log?.warn({ code: err.code, status: err.status }, err.message);
    }
    res.status(err.status).json({ error: err.code, message: err.message });
    return;
  }

  req.log?.error({ err }, "Unhandled error");
  res.status(500).json({
    error: "internal_error",
    message: isProd
      ? "An unexpected error occurred. Please try again."
      : err instanceof Error
        ? err.message
        : String(err),
  });
}
