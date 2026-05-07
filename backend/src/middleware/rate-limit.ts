import rateLimit from "express-rate-limit";

const isProd = process.env.NODE_ENV === "production";

/**
 * General API rate limit — applied to every /api/* route.
 * Generous in dev; tighter in production.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 200 : 2000,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "rate_limit",
    message: "Too many requests. Please slow down and try again later.",
  },
});

/**
 * Strict limit for /analyze — each request hits GitHub API + Gemini AI.
 */
export const analyzeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 15 : 200,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "rate_limit",
    message: "Analyze rate limit reached. You can analyze up to 15 profiles per 15 minutes.",
  },
});

/**
 * Strict limit for /compare — costs 2× analyze + AI verdict call.
 */
export const compareLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 8 : 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "rate_limit",
    message: "Compare rate limit reached. You can compare up to 8 pairs per 15 minutes.",
  },
});
