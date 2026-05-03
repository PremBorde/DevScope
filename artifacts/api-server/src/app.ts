import express, { type Express } from "express";
import helmet from "helmet";
import cors from "cors";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import pinoHttp from "pino-http";
import passport, { configurePassport } from "./config/passport";
import router from "./routes";
import { logger } from "./lib/logger";
import { globalErrorHandler } from "./middleware/error-handler";
import { generalLimiter } from "./middleware/rate-limit";

const PgStore = ConnectPgSimple(session);

const isProd = process.env.NODE_ENV === "production";

// ── Session secret guard ────────────────────────────────────────────────────
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  if (isProd) {
    throw new Error("SESSION_SECRET environment variable is required in production");
  }
  logger.warn("SESSION_SECRET not set — using insecure dev fallback. Set it before deploying.");
}

// ── CORS allowed origins ────────────────────────────────────────────────────
const replitDomains = (process.env.REPLIT_DOMAINS ?? "")
  .split(",")
  .map((d) => d.trim())
  .filter(Boolean)
  .map((d) => `https://${d}`);

function isOriginAllowed(origin: string): boolean {
  // Allow all *.replit.dev preview domains and *.replit.app production domains
  if (/^https:\/\/[^.]+\.replit\.(dev|app)$/.test(origin)) return true;
  if (replitDomains.includes(origin)) return true;
  return false;
}

const app: Express = express();

// Trust Replit's reverse proxy so secure cookies and rate-limit IPs work
app.set("trust proxy", 1);

// ── Security headers ────────────────────────────────────────────────────────
app.use(
  helmet({
    // API server returns JSON — relax CSP and keep the others
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);

// ── Request logger ──────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// ── CORS ────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, callback) => {
      // Same-origin or server-to-server requests (no Origin header)
      if (!origin) return callback(null, true);
      // Dev mode: allow everything
      if (!isProd) return callback(null, true);
      if (isOriginAllowed(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
  }),
);

// ── Body parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: "64kb" }));
app.use(express.urlencoded({ extended: true, limit: "64kb" }));

// ── General rate limit (all /api routes) ───────────────────────────────────
app.use("/api", generalLimiter);

// ── Session ─────────────────────────────────────────────────────────────────
app.use(
  session({
    name: "sid",
    secret: sessionSecret ?? "dev-only-insecure-secret",
    resave: false,
    saveUninitialized: false,
    store: new PgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
      tableName: "user_sessions",
      ttl: 7 * 24 * 60 * 60,
    }),
    cookie: {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
);

// ── Passport ─────────────────────────────────────────────────────────────────
configurePassport();
app.use(passport.initialize());
app.use(passport.session());

// ── Routes ───────────────────────────────────────────────────────────────────
app.use("/api", router);

// ── Global error handler (must be last) ──────────────────────────────────────
app.use(globalErrorHandler);

export default app;
