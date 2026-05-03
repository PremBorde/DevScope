export type ErrorCode =
  | "validation_error"
  | "not_found"
  | "rate_limit"
  | "github_not_found"
  | "github_rate_limit"
  | "github_api_error"
  | "ai_error"
  | "internal_error";

/**
 * Typed application error that flows through Express' global error handler.
 * Throw this anywhere in a route or service; the handler will serialize it
 * as a clean JSON response with the right HTTP status code.
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
