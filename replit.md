# Workspace

## Overview

pnpm workspace monorepo using TypeScript. DevScope AI — a production-grade Neobrutalist SaaS that analyzes GitHub profiles like a recruiter. AI-powered scoring (0-100), Gemini AI insights, hiring recommendations, shareable reports, side-by-side comparisons, and a 30-day improvement roadmap.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Cache**: Redis (ioredis) + in-memory fallback, 30min TTL
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec at `lib/api-spec/openapi.yaml`)
- **Build**: esbuild (CJS bundle)
- **AI**: Gemini AI via `@workspace/integrations-gemini-ai` (model: `gemini-3-flash-preview`)
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **3D**: React Three Fiber + Drei (with CSS fallback)
- **Animation**: Framer Motion + GSAP ScrollTrigger
- **Charts**: Recharts
- **Routing**: Wouter

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Architecture

### Frontend (`artifacts/devscope-ai`)

Pages (all lazy-loaded via React.lazy + Suspense):
- `/` — Landing page (animated 3D hero, feature cards, CTA)
- `/analyze/:username` — Full analysis: score, breakdown, AI insights, score trend, roadmap, 30-day plan
- `/dashboard` — Platform stats, hiring breakdown charts, recent analyses table
- `/dashboard/history` — Per-user analysis history with score chart
- `/report/:username` — **Shareable public report** (no login required): score, breakdown, AI insights, copy-link button
- `/compare` / `/compare/:userA/:userB` — **Side-by-side comparison**: metric table with winner highlights, AI verdict

Hooks:
- `usePageTitle(title)` — sets `document.title` dynamically per page
- `useAnimations` — GSAP hooks (scroll reveal, stagger, count-up, progress bars, hover)
- `useAuth` — session-based GitHub OAuth state

### Backend (`artifacts/api-server`)

Routes:
- `GET  /api/analyze/:username` — GitHub fetch → 5-category scoring → Gemini AI insights → Redis cache → DB save
- `GET  /api/report/:username` — latest saved analysis from DB (pure DB read, no GitHub/AI calls)
- `GET  /api/report/view/:id` — exact snapshot by numeric analysis ID (permanent link)
- `GET  /api/compare?user1=&user2=` — parallel analysis, AI verdict, Redis cached (15min, order-insensitive key)
- `GET  /api/history` — recent analyses (platform-wide)
- `GET  /api/history/:username` — per-user analysis history
- `GET  /api/analyses/:username/trend` — score trend over time
- `GET  /api/analyses/platform/stats` — platform-wide stats
- `POST /api/ai/roadmap` — generate AI improvement roadmap (cached per username)
- `GET  /api/roadmap/:username` — fetch cached roadmap
- `GET  /api/auth/me` — current user session
- `GET  /api/auth/github` — GitHub OAuth redirect
- `GET  /api/auth/github/callback` — OAuth callback

### Database (`lib/db/src/schema/`)
- `analyses` — username, score, hiring rec, avatarUrl, topLanguages, profileJson, repoStatsJson, languageDistJson, scoreBreakdownJson, aiInsightsJson
- `roadmapCache` — username → weeklyPlan JSON + TTL

### Scoring Engine (`artifacts/api-server/src/services/scoring.service.ts`)
| Category | Max | Key factors |
|----------|-----|-------------|
| Repo Quality | 30 | Stars, descriptions, README coverage, commit recency |
| Activity | 25 | Active repo ratio, days since last commit |
| Tech Diversity | 20 | Number of distinct languages, specialization bonus |
| Popularity | 15 | Stars, forks, followers |
| Completeness | 10 | Bio, avatar, location, README coverage |

### Design System — Neobrutalism
- Cream background: `#FFF8E6` (CSS var `--background`)
- Orange accent: `#FF8D3F` (CSS var `--primary`)
- Black borders: 2-4px solid, hard shadows `shadow-[Xpx_Xpx_0_#000]`
- Font: Inter (body), system heading via `font-heading`
- Uppercase labels, tight tracking, no border-radius

## Current Feature Set (Update 14 — Production Hardened)

1. GitHub profile scoring (0-100), 5 categories
2. Gemini AI strengths/weaknesses/summary/hiring recommendation
3. Redis caching (30min TTL for profiles, 15min TTL for compare results; in-memory fallback)
4. GitHub OAuth (optional — app works without login)
5. Analysis history tracking + score trend chart
6. AI improvement roadmap (generated via Gemini, cached)
7. 30-day weekly improvement plan with checkboxes + progress
8. **Shareable public report system**:
   - `GET /api/report/:username` — latest DB snapshot (no GitHub API call)
   - `GET /api/report/view/:id` — exact permanent snapshot by numeric ID
   - `/report/:username` — public report page (DB read, no re-analysis)
   - `/report/view/:id` — permanent snapshot page (bookmarkable forever)
   - Share button (native Web Share API), Copy Link (clipboard), "PUBLIC REPORT" badge
   - Snapshot ID + date watermark in profile card
   - "Generated by DevScope AI" watermark footer
   - "Share this report" black CTA block at bottom of analyze page
9. Side-by-side profile comparison (`/compare?user1=&user2=` query-param URL)
   - Green ✓ / Red ✗ metric rows, AI verdict card (black + orange shadow), swap button
   - Compare result cached in Redis for 15min (sorted key — order-insensitive)
10. Dynamic page titles (`usePageTitle` hook)
11. Full SEO / OG / Twitter meta tags in `index.html`
12. Lazy-loaded pages with Suspense + skeleton loader
13. Contextual error handling (404 / 429 / 500 differentiated)
14. Share Report button in analyze header (clipboard + toast)
15. Compare nav link with Scale icon
