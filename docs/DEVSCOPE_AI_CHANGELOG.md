# DevScope AI — Complete Update Documentation

> Full technical changelog for every feature, fix, and upgrade shipped to DevScope AI.

---

## Table of Contents

1. [Update 1 — Project Initialization & Full-Stack Setup](#update-1)
2. [Update 2 — WebGL Error Fix & Hero Background Upgrade](#update-2)
3. [Update 3 — GSAP Professional Animation System](#update-3)
4. [Update 4 — Deterministic GitHub Scoring Engine v2.0](#update-4)

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
  "profile": {
    "login": "torvalds",
    "name": "Linus Torvalds",
    "avatar_url": "...",
    "bio": null,
    "location": "Portland, OR",
    "public_repos": 8,
    "followers": 300567,
    "created_at": "2011-09-04T..."
  },
  "repoStats": {
    "totalRepos": 8,
    "totalStars": 242447,
    "totalForks": 62997,
    "avgStarsPerRepo": 30305.9,
    "mostStarredRepo": "linux",
    "topLanguages": ["C", "Shell"]
  },
  "languageDistribution": { "C": 62.5, "Shell": 37.5 },
  "scoreBreakdown": {
    "repoQuality": 21,
    "activityConsistency": 25,
    "techDiversity": 5,
    "popularity": 15,
    "completeness": 5,
    "total": 71
  },
  "aiInsights": {
    "strengths": ["..."],
    "weaknesses": ["..."],
    "suggestions": ["..."],
    "hiringRecommendation": "hire",
    "summary": "..."
  },
  "analyzedAt": "2026-05-03T...",
  "cached": false
}
```

---

### Database Schema

```sql
-- lib/db/src/schema/analyses.ts
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

The Replit sandbox environment cannot create a WebGL context (`BindToCurrentSequence failed`). The Three.js `WebGLRenderer` threw an unhandled error, which triggered Vite's runtime error overlay — blocking the entire UI with a red modal.

```
[plugin:runtime-error-plugin] Error creating WebGL context.
  at new WebGLRenderer (...chunk-QXHFEY3F.js:42010)
```

---

### Root Cause

The `Hero3D` component always rendered a `<Canvas>` (React Three Fiber), even in environments where WebGL is unavailable. The check for WebGL was asynchronous (inside `useEffect`) — so the Canvas rendered first, failed, and crashed before the fallback could show.

---

### Fix 1 — Synchronous WebGL Detection

```ts
// artifacts/devscope-ai/src/components/home/Hero3D.tsx

function checkWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    return !!gl;
  } catch {
    return false;
  }
}

export default function Hero3D() {
  // Synchronous initializer — runs BEFORE first render
  const [webGlFailed, setWebGlFailed] = useState(() => !checkWebGL());
  // ...
}
```

**Before:** `useState(false)` → Canvas always renders → crash  
**After:** `useState(() => !checkWebGL())` → CSS fallback shown immediately if no WebGL

---

### Fix 2 — Vite Runtime Error Overlay Disabled

```ts
// artifacts/devscope-ai/vite.config.ts
runtimeErrorOverlay({ types: [] })  // empty array = suppress all runtime error overlays
```

---

### Fix 3 — CSS SVG Network Background (Full Replacement)

The new CSS fallback renders a proper animated network identical in style to the 3D globe:

**Structure:**
```
<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
  ├── <line> elements — static connection lines between nearby nodes
  └── <circle> elements — animated nodes with smooth float motion
        └── <animate attributeName="cx"> — eased position oscillation
        └── <animate attributeName="cy"> — eased position oscillation
</svg>
```

**Node configuration:**
- 52 nodes, radius 1.2–4.7 units (in 100-unit viewBox)
- Colors: orange (`#FF8D3F`), black (`#111111`), white (`#FFFFFF`) in rotation
- Lines drawn between nodes within distance 16 units
- Each node floats ±2–4 units on its own timing with cubic-bezier easing
- `preserveAspectRatio="xMidYMid slice"` ensures full-coverage at any screen size

---

### Fix 4 — Frontend Production Build

The deployed app was showing 404 on all pages because the `dist/public` directory had never been built.

**Root cause:** The `dist/` directory did not exist — Replit deployment was pointing to an empty directory.

**Fix:** Ran the production build manually:
```bash
PORT=18339 BASE_PATH=/ pnpm --filter @workspace/devscope-ai run build
```

This produced:
```
dist/public/index.html              0.73 kB
dist/public/assets/index.css      104 kB
dist/public/assets/Hero3D.js      930 kB  (Three.js chunk, lazy-loaded)
dist/public/assets/index.js      1010 kB
```

The SPA rewrite rule in `artifact.toml` handles client-side routing:
```toml
[[services.production.rewrites]]
from = "/*"
to = "/index.html"
```

---

<a name="update-3"></a>
## Update 3 — GSAP Professional Animation System

**Date:** May 3, 2026
**Type:** Feature — Animation Upgrade

---

### Overview

Replaced ad-hoc inline animations with a clean, reusable GSAP hook system. Every animation is defined once, is tree-shakeable, and uses `gsap.context()` for automatic cleanup.

---

### New Files

```
artifacts/devscope-ai/src/
├── hooks/
│   └── useAnimations.ts              ← All reusable GSAP hooks
└── components/layout/
    └── PageTransition.tsx            ← Per-page entrance wrapper
```

---

### Hook API — `src/hooks/useAnimations.ts`

#### `usePageEntrance(containerRef)`
Animates the page container on mount.
```ts
gsap.fromTo(container, 
  { opacity: 0, y: 28, scale: 0.98 },
  { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: "power3.out" }
)
```

#### `useScrollReveal(containerRef, selector, options?)`
Attaches `ScrollTrigger` to every matching element.
```ts
// Elements with class .reveal animate when they enter the viewport
gsap.fromTo(el,
  { y: 48, opacity: 0 },
  { y: 0, opacity: 1, duration: 0.7, scrollTrigger: { start: "top 85%", once: true } }
)
```

#### `useStaggerEntrance(containerRef, selector, options?)`
Staggers cards/items in sequence on mount.
```ts
gsap.fromTo(cards,
  { y: 36, opacity: 0, scale: 0.95 },
  { y: 0, opacity: 1, scale: 1, stagger: 0.09, duration: 0.5, ease: "power3.out" }
)
```

#### `useCountUp(ref, target, options?)`
Counts a DOM element's text from 0 to `target` using GSAP tween.
```ts
const obj = { val: 0 };
gsap.to(obj, {
  val: target, duration: 1.8, ease: "power2.out",
  onUpdate() { el.textContent = obj.val.toFixed(decimals); }
})
```
Used for: score display (`0 → 71`), stat counters.

#### `useProgressBars(containerRef, selector?)`
Reads `data-width` attribute and animates element width from 0.
```html
<!-- HTML pattern -->
<div class="gsap-bar" data-width="71%" style="width: 0"></div>
```
```ts
gsap.fromTo(bar, { width: "0%" }, { width: bar.dataset.width, duration: 1.1, stagger delay })
```

#### `useCardHover()`
Returns `onMouseEnter` / `onMouseLeave` handlers. Lifts card with scale + y-offset.
```ts
onMouseEnter: gsap.to(el, { y: -6, scale: 1.025, duration: 0.2 })
onMouseLeave: gsap.to(el, { y: 0, scale: 1, duration: 0.35 })
```
Uses `overwrite: "auto"` to prevent tween conflicts on rapid mouse movement.

#### `useBadgeEntrance(ref, delay?)`
Spring-bounce entrance for the hiring verdict badge.
```ts
gsap.fromTo(badge,
  { scale: 0.7, opacity: 0, y: 10 },
  { scale: 1, opacity: 1, y: 0, duration: 0.45, delay: 0.6, ease: "back.out(1.7)" }
)
```

---

### Page Transition Component — `PageTransition.tsx`

```tsx
export default function PageTransition({ children }) {
  const ref = useRef(null);
  usePageEntrance(ref);
  return (
    <div ref={ref} style={{ opacity: 0 }} className="will-change-transform">
      {children}
    </div>
  );
}
```

Every page (`home.tsx`, `analyze.tsx`, `dashboard.tsx`) wraps its content in `<PageTransition>`. The `opacity: 0` inline style prevents FOUC (flash of unstyled content) before GSAP runs.

---

### Animation Timeline per Page

#### Home (`/`)
| Element | Hook | Trigger |
|---|---|---|
| Hero (badge, title, subtitle, form) | Framer Motion `initial/animate` | On mount |
| Feature cards | `useStaggerEntrance(.feature-card)` | On mount |
| Features section, Stats row, CTA | `useScrollReveal(.reveal)` | Scroll |
| Feature card hover | `useCardHover()` | Mouse |

#### Analyze (`/analyze/:username`)
| Element | Hook | Trigger |
|---|---|---|
| Entire page | `PageTransition` → `usePageEntrance` | On mount |
| Score number | `useCountUp` | On mount |
| Score + breakdown progress bars | `useProgressBars(.gsap-bar)` | On mount |
| Hiring verdict badge | `useBadgeEntrance` | On mount, delay 0.5s |
| Stat cards (repos, stars, forks) | `useStaggerEntrance(.stat-card)` | On mount |
| AI insight cards (3 columns) | `useStaggerEntrance(.insight-card)` | On mount |
| Card hover | `useCardHover()` | Mouse |

#### Dashboard (`/dashboard`)
| Element | Hook | Trigger |
|---|---|---|
| Entire page | `PageTransition` → `usePageEntrance` | On mount |
| Stat cards (4-up grid) | `useStaggerEntrance(.stat-card)` | On mount |
| Chart cards (2-up) | `useStaggerEntrance(.chart-card)` | On mount |
| Table rows | `useStaggerEntrance(.table-row)` | On mount |
| Sections below fold | `useScrollReveal(.reveal)` | Scroll |
| Card hover | `useCardHover()` | Mouse |

---

### Performance Notes

- `will-change: transform` applied to animated cards to promote GPU compositing
- `clearProps: "scale,opacity"` used after stagger entrances to remove inline styles
- `overwrite: "auto"` on hover tweens prevents animation conflicts
- `gsap.context()` used in all hooks for automatic cleanup on unmount — no memory leaks
- `ScrollTrigger` registered once at module level: `gsap.registerPlugin(ScrollTrigger)`

---

### Hero Section Spacing Upgrade

The hero was redesigned to show all elements in a single viewport without scrolling:

```
Before: text-6xl/8xl/9xl — heading took full viewport
After:  text-5xl/7xl/8xl — comfortable fit with all elements visible
Gap between elements:
  Before: mb-6 on badge, mb-12 on form
  After:  gap-8 flex column — uniform spacing
New elements added:
  - Underline accent on "Stop guessing"
  - Trust bar: "✓ Free to use · ✓ No account needed · ✓ AI-powered"
  - Scroll indicator with animated line
  - Stats row section: "5 categories · 100 point scale · AI powered"
```

---

<a name="update-4"></a>
## Update 4 — Deterministic GitHub Scoring Engine v2.0

**Date:** May 3, 2026
**Type:** Feature — Backend Scoring Rewrite

---

### Problem with v1.0 Scoring

The original scoring used linear caps and simple ratios. It was opaque:

```ts
// v1 — vague, not explainable
const qualityScore = Math.min(30, Math.round(
  (Math.min(repos.length, 20) / 20) * 15 +
  (Math.min(avgStars, 10) / 10) * 15
));
```

Issues:
- Counted raw repo quantity, not quality
- Linear caps made high-value signals (stars) plateau too quickly
- No reason strings — AI had no context for why a score was what it was
- Scoring had no explainability for end users

---

### New File: `scoring.service.ts`

```
artifacts/api-server/src/services/scoring.service.ts
```

**Main exported function:**
```ts
export function calculateScore(
  user: ScoredUser,
  repos: ScoredRepo[],
  languageDistribution: Record<string, number>
): ScoreResult
```

**Output shape:**
```ts
interface ScoreResult {
  total: number;                       // 0-100
  breakdown: {                         // Rich breakdown with reasons
    repoQuality:  CategoryScore;       // { score, max, reason, sub }
    activity:     CategoryScore;
    diversity:    CategoryScore;
    popularity:   CategoryScore;
    completeness: CategoryScore;
  };
  flat: {                              // Backward-compatible format for frontend
    repoQuality: number;
    activityConsistency: number;
    techDiversity: number;
    popularity: number;
    completeness: number;
    total: number;
  };
  meta: { ... };                       // Raw computed values for transparency
}
```

---

### Scoring Formulas (Deterministic)

#### 1. Repo Quality — max 30 pts

| Sub-component | Formula | Max |
|---|---|---|
| README coverage | `% repos with description ≥ 40 chars × 12` | 12 |
| Avg stars/repo | `log10(avgStars + 1) / log10(51) × 10` | 10 |
| Description coverage | `% repos with any description × 8` | 8 |

**Rationale:** Description ≥ 40 chars is a proxy for a real README. Log normalization means a 50-star repo scores much better than a 0-star repo, but the gap between 500 and 5000 is smaller — preventing viral repos from dominating.

```ts
// Example reasons:
"Low README/description coverage — most repos are undocumented"
"Solid documentation and some community stars"
"Well-documented repos with strong star count"
```

---

#### 2. Activity Consistency — max 25 pts

| Sub-component | Formula | Max |
|---|---|---|
| Recency (days since last push) | Tiered: 0-7d=12, 8-30d=11, 31-60d=9, 61-90d=7, 91-180d=5, 181-365d=3, >365d=0 | 12 |
| Active repo ratio (12 months) | `(repos updated in 12mo / total repos) × 8` | 8 |
| Account maturity | `min(accountAgeYears / 4, 1) × 5` | 5 |

**Rationale:** Recency is step-tiered (not linear) to give credit for anyone active within the last year, while rewarding truly recent contributors more heavily. Account maturity caps at 4 years — beyond that, age doesn't add more signal.

```ts
// Example reasons:
"Very recently active — commits in the past month"
"Inactive — no activity in over a year"
```

---

#### 3. Tech Diversity — max 20 pts

| Sub-component | Formula | Max |
|---|---|---|
| Language breadth | `log10(distinctLangs + 1) / log10(11) × 10` | 10 |
| Industry language weights | Sum of tier weights, capped at 10 | 10 |

**Language tier weights:**

| Tier | Languages | Points each |
|---|---|---|
| Tier 1 (high demand) | TypeScript, Rust, Go, Kotlin, Swift, Dart, Elixir, F# | 2.0 |
| Tier 2 (strong demand) | Python, JavaScript, Java, C#, C++, Scala, Haskell | 1.5 |
| Tier 3 (standard) | Ruby, PHP, Lua, R | 1.0 |
| Tier 4 (tooling) | Shell, Dockerfile, HTML, CSS | 0.5–0.8 |

```ts
// Example reasons:
"Narrow stack — only 2 language(s) detected"
"Good breadth — 5 languages including TypeScript, JavaScript"
"Strong polyglot profile — 10 languages"
```

---

#### 4. Popularity — max 15 pts

| Sub-component | Formula | Max |
|---|---|---|
| Total stars | `log10(totalStars + 1) / log10(501) × 8` | 8 |
| Total forks | `log10(totalForks + 1) / log10(201) × 4` | 4 |
| Followers | `log10(followers + 1) / log10(501) × 3` | 3 |

**Rationale:** All three signals are log-normalized. Baselines: 500 stars = "good," 200 forks = "good," 500 followers = "good." Someone with 10,000 stars scores only marginally above someone with 500. This prevents viral one-hit-wonder repos from giving a 15/15 unfairly.

```ts
// Example reasons:
"No community traction yet — no stars or followers"
"Solid community presence — 48 stars across repos"
"Strong community traction — 242447 stars, 300567 followers"
```

---

#### 5. Completeness — max 10 pts

| Sub-component | Condition | Pts |
|---|---|---|
| Bio | Present and ≥ 20 chars | 3 |
| Bio (partial) | Present but < 20 chars | 1 |
| Profile photo | Non-default avatar (not identicon/gravatar) | 2 |
| Location | Set | 1 |
| Website/blog | Set and non-empty | 1 |
| Repo descriptions | ≥ 60% of repos have descriptions | 2 |
| Repo descriptions | 30–59% coverage | 1 |

```ts
// Example reasons:
"Fully complete professional profile"
"Nearly complete — missing: bio, website"
"Sparse profile — add: profile photo, bio, location"
```

---

### New Debug Route

```
GET /api/debug-score/:username
```

Returns the full scoring breakdown with every sub-component and reason string. No AI call — pure deterministic scoring only. Responds in ~400ms.

**Sample response for `torvalds`:**
```json
{
  "username": "torvalds",
  "score": 71,
  "grade": "B",
  "breakdown": {
    "repoQuality": {
      "score": 21, "max": 30,
      "reason": "Moderate documentation — fewer than half of repos have descriptions",
      "sub": {
        "readmeCoverage":  { "value": 3.0, "max": 12, "note": "25% of repos have meaningful descriptions (2/8)" },
        "avgStarsPerRepo": { "value": 10,  "max": 10, "note": "30305.9 avg stars/repo (log-normalized)" },
        "descCoverage":    { "value": 8,   "max": 8,  "note": "100% of repos have any description" }
      }
    },
    "activity": {
      "score": 25, "max": 25,
      "reason": "Very recently active — commits in the past month",
      "sub": {
        "recency":    { "value": 12, "max": 12, "note": "0 days since last repo update" },
        "activeRatio":{ "value": 8,  "max": 8,  "note": "8/8 repos updated in last 12 months" },
        "maturity":   { "value": 5,  "max": 5,  "note": "14.7 years on GitHub (max 4yr)" }
      }
    },
    "diversity": { "score": 5,  "max": 20, "reason": "Narrow stack — only 2 language(s) detected" },
    "popularity": { "score": 15, "max": 15, "reason": "Strong community traction — 242447 stars, 300567 followers" },
    "completeness": { "score": 5, "max": 10, "reason": "Nearly complete — missing: bio, website" }
  },
  "meta": {
    "ownedRepos": 8,
    "totalStars": 242447,
    "totalForks": 62997,
    "avgStarsPerRepo": 30305.9,
    "readmeCoverage": 25,
    "descriptionCoverage": 100,
    "distinctLanguages": 2,
    "daysSinceLastCommit": 0,
    "activeRepoRatio": 100,
    "accountAgeYears": 14.7
  },
  "scoringVersion": "2.0.0-deterministic",
  "explanation": {
    "repoQuality":  "README coverage (12) + avg stars log-norm (10) + description ratio (8)",
    "activity":     "Days-since-last-commit tier (12) + active-repo ratio last 12mo (8) + account maturity (5)",
    "diversity":    "Language breadth log-norm (10) + industry-language tier weights (10)",
    "popularity":   "Total stars log-norm vs 500 (8) + forks vs 200 (4) + followers vs 500 (3)",
    "completeness": "Meaningful bio (3) + custom avatar (2) + location (1) + website (1) + repo desc ratio (2)"
  }
}
```

---

### Grade Scale

| Score | Grade | Hiring Signal |
|---|---|---|
| 80–100 | A | Strong Hire |
| 70–79 | B | Hire |
| 55–69 | C | Consider |
| 40–54 | D | Consider / Pass |
| 0–39 | F | Pass |

---

### Real-World Score Examples

| Developer | Score | Notes |
|---|---|---|
| `torvalds` | 71/100 B | Maxed popularity + activity, narrow personal stack |
| `gaearon` (Dan Abramov) | 84/100 A | Strong docs, TypeScript, very active |
| `addyosmani` | 92/100 A | 76 repos, 84K stars, committed today |

---

### Changes to Analyze Route

The `/api/analyze/:username` response now includes `scoreDetails` alongside the existing `scoreBreakdown`:

```json
{
  "scoreBreakdown": { "repoQuality": 21, "activityConsistency": 25, ... },
  "scoreDetails": {
    "repoQuality": { "score": 21, "max": 30, "reason": "...", "sub": { ... } },
    ...
  }
}
```

The AI prompt is also enriched with reason strings from the scoring engine, so Gemini's insights are directly grounded in the actual computed values — not just raw numbers.

---

## API Reference Summary

| Endpoint | Method | Description |
|---|---|---|
| `/api/healthz` | GET | Health check |
| `/api/analyze/:username` | GET | Full analysis (score + AI insights) |
| `/api/debug-score/:username` | GET | Scoring breakdown only (no AI, fast) |
| `/api/history` | GET | Recent 20 analyses |
| `/api/history/:username` | GET | Analyses for specific user |
| `/api/history/stats/platform` | GET | Platform aggregate stats |

---

## File Structure Reference

```
artifacts/
├── api-server/src/
│   ├── routes/
│   │   ├── analyze.ts          ← Main analysis route (uses scoring service)
│   │   ├── debug.ts            ← GET /debug-score/:username
│   │   ├── history.ts          ← History + platform stats
│   │   ├── health.ts           ← Healthcheck
│   │   └── index.ts            ← Route registration
│   └── services/
│       └── scoring.service.ts  ← Deterministic scoring engine v2.0
└── devscope-ai/src/
    ├── hooks/
    │   └── useAnimations.ts    ← All GSAP reusable hooks
    ├── components/
    │   ├── layout/
    │   │   ├── Navbar.tsx
    │   │   └── PageTransition.tsx
    │   └── home/
    │       └── Hero3D.tsx      ← WebGL + CSS SVG network fallback
    └── pages/
        ├── home.tsx            ← Landing page
        ├── analyze.tsx         ← Analysis results
        ├── dashboard.tsx       ← Platform dashboard
        └── not-found.tsx       ← 404

lib/
├── db/src/schema/analyses.ts   ← PostgreSQL schema
└── integrations-gemini-ai/     ← Gemini AI client

```
