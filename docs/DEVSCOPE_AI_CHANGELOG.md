# DevScope AI — Complete Update Documentation

> Full technical changelog for every feature, fix, and upgrade shipped to DevScope AI.

---

## Table of Contents

1. [Update 1 — Project Initialization & Full-Stack Setup](#update-1)
2. [Update 2 — WebGL Error Fix & Hero Background Upgrade](#update-2)
3. [Update 3 — GSAP Professional Animation System](#update-3)
4. [Update 4 — Deterministic GitHub Scoring Engine v2.0](#update-4)
5. [Update 5 — Redis Caching for GitHub API](#update-5)
6. [Update 6 — GitHub OAuth Authentication (Optional)](#update-6)
7. [Update 7 — User History Tracking + Growth Over Time Chart](#update-7)
8. [Update 8 — AI Improvement Roadmap ("Your Action Plan")](#update-8)

---

<a name="update-1"></a>
## Update 1 — Project Initialization & Full-Stack Setup

**Date:** May 3, 2026
**Type:** Feature — Initial Build

---

### Overview

Built the complete DevScope AI SaaS from scratch. A Neobrutalist-designed tool that analyzes any GitHub profile like a recruiter — returning a 0-100 score, language distribution, AI insights, and a hiring recommendation.

---

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite, Tailwind CSS, shadcn/ui |
| 3D / Animation | React Three Fiber, Drei, GSAP, Framer Motion |
| Charts | Recharts |
| Routing | Wouter |
| Backend | Express.js (Node.js) |
| AI | Gemini AI (via Replit AI Integration) |
| Database | PostgreSQL + Drizzle ORM |
| API Contract | OpenAPI spec → Orval codegen (React Query hooks + Zod schemas) |

---

### Design System — Neobrutalism

```
Background:   #FFF8E6  (cream — HSL 43 100% 95%)
Primary:      #FF8D3F  (orange)
Foreground:   #000000  (pure black)
Borders:      2–4px solid black
Shadows:      4px 4px 0 0 #000 (hard, no blur)
Font (heading): Space Grotesk — bold, uppercase
Font (body):    Inter
Card style:    slight rotation (±0.5–1.5deg), hover lifts -translate-y-2
```

---

### Frontend Pages

#### `/` — Landing Page (`home.tsx`)
- Full-screen hero with 3D network globe (React Three Fiber) or CSS fallback
- Animated headline with GSAP scroll reveals
- Feature cards (Instant Scoring, AI Insights, Hiring Verdict)
- GitHub username search form → navigate to `/analyze/:username`
- Stats row + bottom CTA section

#### `/analyze/:username` — Analysis Results (`analyze.tsx`)
- Animated score counter (0 → actual value)
- Score progress bar with smooth animation
- 5-category score breakdown with progress bars
- Language distribution pie chart (Recharts)
- Repo stats grid (total repos, stars, forks, avg stars)
- AI insights panel: strengths, weaknesses, suggestions
- Hiring verdict badge: `strong_hire`, `hire`, `consider`, `pass`

#### `/dashboard` — Platform Dashboard (`dashboard.tsx`)
- Platform stat cards: total analyses, unique users, avg score, recent count
- Top languages bar chart
- Hiring breakdown donut chart
- Recent analyses table (click any row to re-analyze)

---

### Backend API Routes

```
GET /api/healthz                   → { status: "ok" }
GET /api/analyze/:username         → Full analysis object
GET /api/history                   → Recent 20 analyses
GET /api/history/:username         → Analyses for a specific user
GET /api/history/stats/platform    → Platform-wide aggregate stats
```

#### `/api/analyze/:username` — Full Response Shape

```json
{
  "id": "uuid",
  "username": "torvalds",
  "profile": { ... },
  "repoStats": { "totalRepos": 8, "totalStars": 242447, ... },
  "languageDistribution": { "C": 62.5, "Shell": 37.5 },
  "scoreBreakdown": { "repoQuality": 21, "activityConsistency": 25, ... },
  "aiInsights": { "strengths": [...], "hiringRecommendation": "hire", ... },
  "analyzedAt": "2026-05-03T...",
  "cached": false
}
```

---

### Database Schema

```sql
CREATE TABLE analyses (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username                TEXT NOT NULL,
  score                   NUMERIC NOT NULL,
  hiring_recommendation   TEXT NOT NULL,
  avatar_url              TEXT,
  top_languages           TEXT[],
  profile_json            JSONB,
  repo_stats_json         JSONB,
  language_distribution_json JSONB,
  score_breakdown_json    JSONB,
  ai_insights_json        JSONB,
  analyzed_at             TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Caching

- **In-memory cache** per username with 10-minute TTL
- Cache key: `username.toLowerCase()`
- Responses include `"cached": true` when served from cache

---

### AI Integration (Gemini)

- Model: `gemini-3-flash-preview`
- Prompt includes all score categories, repo stats, and language data
- Returns structured JSON: `{ strengths, weaknesses, suggestions, hiringRecommendation, summary }`
- Fallback response generated deterministically if AI call fails

---

<a name="update-2"></a>
## Update 2 — WebGL Error Fix & Hero Background Upgrade

**Date:** May 3, 2026
**Type:** Bug Fix + Visual Upgrade

---

### Problem

The Replit sandbox cannot create a WebGL context. The Three.js `WebGLRenderer` threw an unhandled error which triggered Vite's runtime error overlay — blocking the entire UI.

---

### Fix 1 — Synchronous WebGL Detection

```ts
function checkWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    return !!gl;
  } catch { return false; }
}

// Synchronous initializer — runs BEFORE first render
const [webGlFailed, setWebGlFailed] = useState(() => !checkWebGL());
```

### Fix 2 — Vite Runtime Error Overlay Disabled

```ts
runtimeErrorOverlay({ types: [] })
```

### Fix 3 — CSS SVG Network Background Fallback

52 animated SVG nodes with per-node floating animation, connection lines between nearby nodes, full-coverage `preserveAspectRatio="xMidYMid slice"`. Visually identical to the 3D globe at zero cost.

### Fix 4 — Frontend Production Build

Built `dist/public/` for deployment. The SPA rewrite rule in `artifact.toml` sends all paths to `index.html` for client-side routing.

---

<a name="update-3"></a>
## Update 3 — GSAP Professional Animation System

**Date:** May 3, 2026
**Type:** Feature — Animation Upgrade

---

### New Files

```
artifacts/devscope-ai/src/
├── hooks/useAnimations.ts          ← All reusable GSAP hooks
└── components/layout/PageTransition.tsx
```

### Hook API

| Hook | Purpose |
|---|---|
| `usePageEntrance(ref)` | Fade + slide + scale entrance on mount |
| `useScrollReveal(ref, selector)` | ScrollTrigger on `.reveal` elements |
| `useStaggerEntrance(ref, selector)` | Stagger cards sequentially |
| `useCountUp(ref, target)` | Animated number count-up (e.g. score 0→71) |
| `useProgressBars(ref, selector)` | Reads `data-width` attr, animates to value |
| `useCardHover()` | Returns `onMouseEnter/Leave` for lift effect |
| `useBadgeEntrance(ref, delay)` | Spring-bounce for hiring verdict badge |

All hooks use `gsap.context()` for automatic cleanup on unmount — no memory leaks.

---

<a name="update-4"></a>
## Update 4 — Deterministic GitHub Scoring Engine v2.0

**Date:** May 3, 2026
**Type:** Feature — Backend Scoring Rewrite

---

### New File: `scoring.service.ts`

Replaces vague linear formulas with log-normalized, categorized, explainable scoring.

### Scoring Formula (Total: 100 pts)

#### Repo Quality — 30 pts
| Sub | Formula | Max |
|---|---|---|
| README coverage | `% repos with desc ≥ 40 chars × 12` | 12 |
| Avg stars/repo | `log10(avg+1) / log10(51) × 10` | 10 |
| Description coverage | `% repos with any desc × 8` | 8 |

#### Activity — 25 pts
| Sub | Formula | Max |
|---|---|---|
| Recency tier | 0-7d=12, 8-30d=11, 31-60d=9 ... >365d=0 | 12 |
| Active ratio (12mo) | `(repos updated/total) × 8` | 8 |
| Account maturity | `min(years/4, 1) × 5` | 5 |

#### Tech Diversity — 20 pts
| Sub | Formula | Max |
|---|---|---|
| Language breadth | `log10(langs+1)/log10(11) × 10` | 10 |
| Industry weights | Tier 1=2.0pt (TS/Rust/Go), Tier 2=1.5pt (Python/JS)... | 10 |

#### Popularity — 15 pts
Stars, forks, followers — all log-normalized vs 500/200/500 baselines.

#### Completeness — 10 pts
Bio, avatar, location, website, repo description ratio — each scored separately.

### New Endpoint: `GET /api/debug-score/:username`
Returns full breakdown with reason strings, sub-scores, and scoring metadata. No AI call — responds in ~400ms.

### Real-World Results
| Developer | Score | Grade |
|---|---|---|
| `torvalds` | 71/100 | B |
| `gaearon` | 84/100 | A |
| `addyosmani` | 92/100 | A |

---

<a name="update-5"></a>
## Update 5 — Redis Caching for GitHub API

**Date:** May 3, 2026
**Type:** Feature — Backend Performance

---

### Overview

Replaced the single-process in-memory `Map` cache with a two-layer Redis-first caching system. GitHub API responses are now cached for 30 minutes and survive server restarts.

---

### Architecture

```
Request hits /api/analyze/:username
          │
          ▼
  ┌─────────────┐      HIT       ┌──────────────────────┐
  │  Redis      │ ─────────────▶ │  Return cached JSON  │
  │  (primary)  │                │  cached: true        │
  └─────────────┘                │  cacheSource: "redis"│
          │ MISS                 └──────────────────────┘
          ▼
  ┌─────────────┐      HIT
  │  Memory Map │ ─────────────▶  (same as above, source: "memory")
  │  (fallback) │
  └─────────────┘
          │ MISS
          ▼
  ┌─────────────────────┐
  │  GitHub API         │
  │  + Score + Gemini   │
  │  + DB insert        │
  └─────────────────────┘
          │
          ▼
  Write to Redis (TTL 1800s) + Memory
  Return: cached: false, cacheSource: null
```

---

### New Files

| File | Purpose |
|---|---|
| `src/config/redis.ts` | ioredis client, connect/get/set/del helpers |
| `src/services/github-cache.service.ts` | Two-layer cache logic with HIT/MISS logging |

---

### Response Fields Added

```json
{
  "cached": true,
  "cacheSource": "redis"
}
```

---

### Server Startup

```json
"start": "redis-server --daemonize yes --port 6379 --loglevel warning --save '' && node ./dist/index.mjs"
```

Redis starts as a daemon before Node. If Redis is unavailable, the fallback memory cache kicks in silently.

---

### Performance

| Scenario | Response Time |
|---|---|
| Cache MISS (GitHub + Gemini) | 7–10 seconds |
| Cache HIT (Redis) | **1–2 ms** |
| Cache HIT (Memory fallback) | **< 1 ms** |

Repeat analysis went from **8.2 seconds → 2 milliseconds** — a 4,100× speedup.

---

### Log Output

```
[CACHE MISS] Fetching fresh data from GitHub API    username: "torvalds"
[CACHE SET]  Stored in Redis + memory  ttl: 1800
[CACHE HIT]  Redis — returning cached GitHub data   username: "torvalds"
```

---

<a name="update-6"></a>
## Update 6 — GitHub OAuth Authentication (Optional)

**Date:** May 3, 2026
**Type:** Feature — Authentication

---

### Overview

Added optional GitHub OAuth login to DevScope AI. Users can still use the entire app without logging in. Login simply enables auto-fill of the username and a personalized "Analyze My Profile" button.

---

### Philosophy: Auth is Optional

```
Without login:  Enter any GitHub username manually → full analysis
With login:     Username auto-filled → "Analyze My Profile" one-click button
```

The app is 100% functional without an account. Login is a convenience upgrade, not a gate.

---

### Backend — New Files & Changes

#### `src/config/passport.ts`
Sets up Passport.js with the GitHub OAuth 2 strategy.

```ts
passport.use(new GitHubStrategy({
  clientID:     process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL:  process.env.GITHUB_CALLBACK_URL ?? "/api/auth/github/callback",
}, (_accessToken, _refreshToken, profile, done) => {
  const user = {
    githubId:    profile.id,
    username:    profile.username,
    displayName: profile.displayName,
    avatarUrl:   profile.photos?.[0]?.value,
    profileUrl:  profile.profileUrl,
  };
  return done(null, user);
}));
```

If `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` are missing, the strategy is skipped and OAuth routes return `503 oauth_disabled`. The rest of the app is unaffected.

---

#### `src/routes/auth.ts`

| Route | Method | Description |
|---|---|---|
| `/api/auth/github` | GET | Redirects to GitHub for authorisation |
| `/api/auth/github/callback` | GET | GitHub redirects here after approval |
| `/api/auth/me` | GET | Returns current session user (or null) |
| `/api/auth/logout` | POST | Destroys session, clears cookie |

##### `/api/auth/me` response shape
```json
// Logged in
{ "user": { "githubId": "...", "username": "torvalds", "displayName": "Linus Torvalds", "avatarUrl": "...", "profileUrl": "..." }, "oauthEnabled": true }

// Not logged in
{ "user": null, "oauthEnabled": true }

// OAuth not configured
{ "user": null, "oauthEnabled": false }
```

---

#### `src/app.ts` — Session & Passport Middleware

```ts
// PostgreSQL-backed sessions (survive restarts)
app.use(session({
  name: "sid",
  secret: process.env.SESSION_SECRET,
  store: new PgStore({ conString: process.env.DATABASE_URL, createTableIfMissing: true }),
  cookie: {
    httpOnly: true,
    secure: isProd,                        // HTTPS in prod
    sameSite: isProd ? "none" : "lax",     // works behind Replit proxy
    maxAge: 7 * 24 * 60 * 60 * 1000,      // 7 days
  },
}));

app.use(passport.initialize());
app.use(passport.session());
```

Sessions are stored in the `user_sessions` PostgreSQL table (auto-created). They survive server restarts unlike memory-only sessions.

---

### Frontend — New Files & Changes

#### `src/hooks/useAuth.ts`

```ts
const { user, isLoading, oauthEnabled, login, logout } = useAuth();
```

| Field | Type | Description |
|---|---|---|
| `user` | `AuthUser \| null` | Current logged-in user, or null |
| `isLoading` | `boolean` | True while the `/api/auth/me` check is in flight |
| `oauthEnabled` | `boolean` | Whether the server has GitHub OAuth configured |
| `login()` | `() => void` | Redirects to `/api/auth/github` |
| `logout()` | `async () => void` | Calls `POST /api/auth/logout`, clears state |

After OAuth redirect, the hook detects `?auth=success` in the URL, cleans it, and re-fetches the user — no page reload needed.

---

#### `src/components/layout/Navbar.tsx` — Auth-Aware Header

| State | Navbar shows |
|---|---|
| Loading | Nothing in auth area |
| Not logged in, OAuth enabled | "Login with GitHub" button (GitHub icon) |
| Logged in | Avatar + username + "Analyze Mine" button + logout icon |
| OAuth disabled | Nothing (anonymous-only mode) |

---

#### `src/pages/home.tsx` — Auto-fill & Profile Button

```
If logged in:
  ├── Input pre-filled with user.username
  └── "Analyze My Profile (@username)" button with avatar

If not logged in, OAuth enabled:
  └── "Login to auto-fill your username" button (outline style)

Always:
  └── Manual input + Analyze button (no login required)
```

---

### OAuth Setup — Required by User

To enable GitHub OAuth, you need to register a GitHub OAuth App:

1. Go to **https://github.com/settings/developers → OAuth Apps → New OAuth App**
2. Fill in:
   - **Application name:** DevScope AI
   - **Homepage URL:** your Replit app URL
   - **Authorization callback URL:** `https://YOUR-DOMAIN/api/auth/github/callback`
3. Copy the **Client ID** and generate a **Client Secret**
4. Set these as Replit secrets:
   - `GITHUB_CLIENT_ID` — the client ID from GitHub
   - `GITHUB_CLIENT_SECRET` — the client secret from GitHub
   - `GITHUB_CALLBACK_URL` — `https://YOUR-DOMAIN/api/auth/github/callback`

Without these secrets, the app works normally in anonymous mode.

---

### Session Storage

```sql
-- Auto-created by connect-pg-simple
CREATE TABLE user_sessions (
  sid    VARCHAR     NOT NULL PRIMARY KEY,
  sess   JSON        NOT NULL,
  expire TIMESTAMP   NOT NULL
);
CREATE INDEX ON user_sessions (expire);
```

Sessions are stored in PostgreSQL, not memory — they survive server restarts and scale across multiple processes.

---

### Security Notes

- `httpOnly: true` — session cookie is inaccessible to JavaScript
- `secure: true` in production — cookie only sent over HTTPS
- `sameSite: "none"` in production — required for cross-site requests through the Replit proxy
- `SESSION_SECRET` from Replit Secrets — never hardcoded
- OAuth strategy skipped entirely if credentials are missing — no attack surface

---

## Complete API Reference

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/healthz` | GET | None | Health check |
| `/api/auth/github` | GET | None | Start GitHub OAuth flow |
| `/api/auth/github/callback` | GET | None | OAuth callback (GitHub → app) |
| `/api/auth/me` | GET | Optional | Get current session user |
| `/api/auth/logout` | POST | Session | Destroy session |
| `/api/analyze/:username` | GET | None | Full analysis (score + AI insights) |
| `/api/debug-score/:username` | GET | None | Scoring breakdown only (no AI) |
| `/api/history` | GET | None | Recent 20 analyses |
| `/api/history/:username` | GET | None | Analyses for specific user |
| `/api/history/stats/platform` | GET | None | Platform aggregate stats |

---

## Complete File Structure

```
artifacts/
├── api-server/src/
│   ├── config/
│   │   ├── passport.ts         ← GitHub OAuth strategy
│   │   └── redis.ts            ← ioredis client + helpers
│   ├── routes/
│   │   ├── auth.ts             ← /auth/github, /callback, /me, /logout
│   │   ├── analyze.ts          ← Main analysis route (Redis-cached)
│   │   ├── debug.ts            ← GET /debug-score/:username (Redis-cached)
│   │   ├── history.ts          ← History + platform stats
│   │   ├── health.ts           ← Healthcheck
│   │   └── index.ts            ← Route registration
│   ├── services/
│   │   ├── scoring.service.ts  ← Deterministic scoring engine v2.0
│   │   └── github-cache.service.ts ← Two-layer Redis + memory cache
│   ├── types/
│   │   └── session.d.ts        ← Express.User interface extension
│   └── app.ts                  ← Express app: session, passport, CORS
└── devscope-ai/src/
    ├── hooks/
    │   ├── useAnimations.ts    ← All GSAP reusable hooks
    │   └── useAuth.ts          ← Auth state, login(), logout()
    ├── components/
    │   ├── layout/
    │   │   ├── Navbar.tsx      ← Auth-aware header
    │   │   └── PageTransition.tsx
    │   └── home/
    │       └── Hero3D.tsx      ← WebGL + SVG fallback
    └── pages/
        ├── home.tsx            ← Landing page (auto-fill if logged in)
        ├── analyze.tsx         ← Analysis results
        ├── dashboard.tsx       ← Platform dashboard
        ├── history.tsx         ← History + growth chart (Update 7)
        └── not-found.tsx       ← 404

lib/
├── db/src/schema/analyses.ts  ← PostgreSQL analyses table
└── integrations-gemini-ai/    ← Gemini AI client
```

---

<a name="update-7"></a>
## Update 7 — User History Tracking + Growth Over Time Chart

**Date:** May 3, 2026
**Type:** Feature — SaaS Retention + Improvement Tracking

---

### Overview

Transformed DevScope AI from a one-shot tool into a retention-focused SaaS. Users can now browse every past analysis by username, re-trigger scans with one click, and visualise their GitHub score trajectory on an animated line chart — turning each return visit into a meaningful progress check.

---

### Goals

1. **Retention** — give users a reason to return by showing their evolving history
2. **Improvement tracking** — quantify GitHub score growth over time with a visual chart
3. **Discoverability** — surface any username's historical record instantly via search

---

### Backend (no new routes needed)

All required endpoints already existed from previous work:

| Route | Purpose |
|---|---|
| `GET /api/history` | Recent 20 platform-wide analyses (with `?limit=N`) |
| `GET /api/history/:username` | All analyses for one username, newest first |
| `GET /api/stats` | Platform-wide aggregate stats |

Data stored in the `analyses` PostgreSQL table includes `id`, `username`, `score`, `hiringRecommendation`, `avatarUrl`, `topLanguages`, `analyzedAt` — all the fields needed by the history UI.

---

### Frontend — `/dashboard/history` Page (`pages/history.tsx`)

New full-page route at `/dashboard/history`. Three logical sections:

#### 1. Header + Username Search
- Prominent `HISTORY` heading with a `History` icon (Lucide)
- Username search bar (`<Input>` + `<Button>`) — press Enter or click Search
- If logged in via GitHub OAuth, auto-fills and queries the session user's username
- "All" button clears username filter and returns to global platform view

#### 2. User Summary Stats (when username is selected)
Four stat cards shown in neobrutalist style with slight rotations:
- **Total Analyses** — count of all DB rows for this username
- **Best Score** — highest score achieved
- **Latest Score** — most recent analysis score
- **Avg Score** — arithmetic mean across all analyses

Cards use `SCORE_COLOR()` helper to colour scores green/orange/red based on thresholds.

#### 3. "Your Growth Over Time" Line Chart
Renders only when a username is selected **and** has 2+ historical analyses.

**Recharts components used:**
```
LineChart → Line + XAxis + YAxis + CartesianGrid + Tooltip + ReferenceLine
```

**Key design choices:**
- Data sorted ascending (oldest → newest) for left-to-right time flow (API returns desc, reversed on frontend)
- **Reference lines** at y=70 (green, "Hire") and y=50 (orange, "Consider") so users know the thresholds
- **Custom dot** (`CustomDot`) — coloured circle with black border whose fill matches `SCORE_COLOR(score)`
- **Custom tooltip** (`CustomTooltip`) — shows date label + large score in matching colour + "/100"
- **Overall Change** badge — shows `+N pts` or `-N pts` delta from first to last analysis
- Recharts built-in `animationBegin={200}` + `animationDuration={1200}` + `animationEasing="ease-out"` for chart draw-on animation

#### 4. History Table
Columns: **User | Score | Verdict | Languages | When | Actions**

- Score coloured via `SCORE_COLOR()` helper
- Verdict shown as `<HiringBadge>` with colour-coded background
- Top 3 languages shown as coloured inline chips
- "When" formatted by `timeAgo()` (e.g. "3h ago", "Jan 15")
- **Re-analyze button** — opens `/analyze/:username` triggering a fresh AI analysis; result auto-saved to DB
- **View button** — `ArrowUpRight` icon navigating to the cached analysis result
- Clicking a username row auto-fills the search bar and switches to that user's personal history
- GSAP stagger entrance: rows start at `opacity: 0` and animate in with 0.04s stagger via `useStaggerEntrance`

#### 5. Empty / CTA States
- No data + no username → "Browse recent analyses" global view
- No data for username → "Analyze this profile to start tracking" + direct Re-analyze button
- No username selected → orange rotated CTA card at bottom: "Track your own progress"

---

### Navbar Updates (`components/layout/Navbar.tsx`)

Added **History** nav link between Dashboard and the search bar:
- Icon: `History` (Lucide) displayed inline with label
- Active state: orange `bg-primary` background + `shadow-[2px_2px_0_#000]` border — matches Dashboard active style
- Inactive state: transparent border, hover lifts with black shadow

---

### Router Update (`App.tsx`)

Added route:
```tsx
<Route path="/dashboard/history" component={HistoryPage} />
```
Placed before the catch-all `<Route component={NotFound} />`.

---

### Data Flow

```
User types username → setActiveUsername(val)
  → useGetUserAnalysisHistory(username) fires
  → GET /api/history/:username → analyses[] sorted desc by analyzedAt
  → Table renders rows (GSAP stagger entrance)
  → chartData = [...analyses].sort(asc) → LineChart renders with animation
  → Summary stat cards compute max/avg/latest from same data
```

Re-analyze button:
```
click → setLocation("/analyze/username")
  → Analyze page triggers GET /api/analyze/:username
  → Backend fetches GitHub + scores + Gemini AI
  → Result saved to analyses table (existing save logic in analyze.ts route)
  → User navigates back to /dashboard/history → fresh row appears
```

---

### Files Changed

| File | Change |
|---|---|
| `artifacts/devscope-ai/src/pages/history.tsx` | **Created** — full History page |
| `artifacts/devscope-ai/src/App.tsx` | Added `/dashboard/history` route |
| `artifacts/devscope-ai/src/components/layout/Navbar.tsx` | Added History nav link with active state |

No backend changes — all required routes and DB schema were already in place.

---

### Full Project Structure (after Update 7)

```
artifacts/
├── api-server/src/
│   ├── routes/
│   │   ├── analyze.ts      ← GitHub fetch + score + Gemini + DB save
│   │   ├── history.ts      ← GET /history, /history/:username, /stats
│   │   └── auth.ts         ← Optional GitHub OAuth
│   └── services/
│       └── scoring.service.ts  ← Deterministic v2.0 scoring engine
└── devscope-ai/src/
    ├── components/layout/
    │   ├── Navbar.tsx      ← Auth-aware + History link
    │   └── PageTransition.tsx
    └── pages/
        ├── home.tsx            ← Landing page (auto-fill if logged in)
        ├── analyze.tsx         ← Analysis results
        ├── dashboard.tsx       ← Platform dashboard
        ├── history.tsx         ← History + growth chart (Update 7)
        └── not-found.tsx       ← 404

lib/
├── db/src/schema/analyses.ts  ← PostgreSQL analyses table
└── integrations-gemini-ai/    ← Gemini AI client
```

---

<a name="update-8"></a>
## Update 8 — AI Improvement Roadmap ("Your Action Plan")

**Date:** May 3, 2026
**Type:** Feature — Growth Tool / AI Personalization

---

### Overview

Transformed DevScope AI from a passive analyzer into an active growth tool. After every analysis, Gemini AI generates a personalized 4-phase improvement roadmap — specific, concise, actionable bullet points tied to the developer's actual numbers. Users can collapse phases, check off completed actions, and track overall progress via a live progress bar.

---

### Backend — `GET /api/roadmap/:username` (`routes/roadmap.ts`)

Fetches the latest DB row for the username, then calls Gemini AI with a structured prompt requesting a personalized JSON roadmap.

**Gemini prompt highlights:**
- Injects actual score breakdown numbers (repoQuality/30, activity/25, etc.)
- Injects real strengths, weaknesses, and suggestions from the prior AI analysis
- Injects repo stats (totalStars, topLanguages, reposWithReadme, etc.)
- Instructs Gemini: "Be specific. Reference their actual numbers. No generic advice. Max 12 words per action."
- `responseMimeType: "application/json"` — Gemini returns structured JSON directly

**Roadmap shape:**
```json
{
  "username": "torvalds",
  "score": 71,
  "immediate":  { "label": "Immediate Actions", "timeframe": "This week",    "actions": [...] },
  "shortTerm":  { "label": "Short-Term",        "timeframe": "1–2 weeks",    "actions": [...] },
  "midTerm":    { "label": "Mid-Term",           "timeframe": "2–4 weeks",   "actions": [...] },
  "longTerm":   { "label": "Long-Term",          "timeframe": "1–3 months",  "actions": [...] },
  "generatedAt": "2026-05-03T07:41:24.264Z"
}
```

Each action: `{ "text": "...", "priority": "high|medium|low", "category": "..." }`

**Deterministic fallback** — if Gemini fails, returns a score-aware static roadmap (logic differs for score < 50 / < 70 / ≥ 70).

Route registered at `/api/roadmap` in `routes/index.ts`.

---

### OpenAPI Spec + Codegen

Three new schemas added to `lib/api-spec/openapi.yaml`:

| Schema | Fields |
|---|---|
| `RoadmapAction` | `text`, `priority` (high/medium/low enum), `category` |
| `RoadmapPhase` | `label`, `timeframe`, `actions: RoadmapAction[]` |
| `Roadmap` | `username`, `score`, `immediate`, `shortTerm`, `midTerm`, `longTerm`, `generatedAt` |

New path: `GET /roadmap/{username}` with `operationId: getAiRoadmap`.

Codegen (`pnpm --filter @workspace/api-spec run codegen`) regenerated:
- `useGetAiRoadmap` hook + `getGetAiRoadmapQueryKey` in `api-client-react`
- `RoadmapAction`, `RoadmapPhase`, `Roadmap`, `RoadmapActionPriority` types in `api.schemas.ts`
- Corresponding Zod schemas in `lib/api-zod`

Also fixed a pre-existing `tsc --build` error: added `"@types/node": "catalog:"` to `devDependencies` in `lib/integrations-gemini-ai/package.json`.

---

### Frontend — "Your Action Plan" (`pages/analyze.tsx`)

Added immediately after the AI Insights section. Loads **in parallel** with the main analysis (`enabled: !!username && !!data`, `staleTime: 15min`, `retry: false`).

**State:**
```ts
const [checked,   setChecked]   = useState<Set<string>>(new Set()); // "phaseKey-idx"
const [collapsed, setCollapsed] = useState<Set<string>>(new Set()); // phase keys
```

**4-phase timeline layout:**

| Phase | Icon | Badge | Accent |
|---|---|---|---|
| Immediate | ⚠️ | NOW | Red |
| Short-Term | 🚀 | SOON | Orange |
| Mid-Term | ✅ | NEXT | Blue |
| Long-Term | ⭐ | LATER | Purple |

**Timeline gutter** — 40×40 Neobrutalist coloured dot + vertical connector bar. Dot turns ✓ green when all actions in that phase are checked off.

**Phase card header** — click to collapse/expand; shows `X/N done` counter + rotating chevron.

**Action rows:**
- Mark-as-Done checkbox — 24×24px bordered square, green fill + ✓ on check; text strikes through and greys out
- Priority badge — `HIGH` (red) / `MED` (yellow) / `LOW` (green)

**Overall Progress Bar** — sums all actions across all 4 phases, shows `X/N actions complete — Y%` with animated CSS width transition.

**Section header** — "Gemini AI" eyebrow + target score (`current + 20`, capped at 100) shown top-right.

**Loading state** — spinner + "Generating your personalized roadmap…" + 3 skeleton pulse blocks while waiting for Gemini.

---

### Files Changed

| File | Change |
|---|---|
| `artifacts/api-server/src/routes/roadmap.ts` | Created — roadmap route + Gemini generation + fallback |
| `artifacts/api-server/src/routes/index.ts` | Registered `/api/roadmap` |
| `lib/api-spec/openapi.yaml` | Added `RoadmapAction`, `RoadmapPhase`, `Roadmap` schemas + endpoint |
| `lib/api-client-react/src/generated/api.ts` | Regenerated — `useGetAiRoadmap` hook added |
| `lib/api-client-react/src/generated/api.schemas.ts` | Regenerated — Roadmap types added |
| `lib/integrations-gemini-ai/package.json` | Added `@types/node` devDependency (typecheck fix) |
| `artifacts/devscope-ai/src/pages/analyze.tsx` | Added roadmap hook, state, and full "Your Action Plan" section |

---

### Verified

- `curl http://localhost:80/api/roadmap/torvalds` → 200 in ~10s with 4 phases × 3 personalized actions
- `pnpm --filter @workspace/devscope-ai exec tsc --noEmit` → 0 errors
- No browser console errors after clean Vite restart
