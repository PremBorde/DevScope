# Workspace

## Overview

pnpm workspace monorepo using TypeScript. DevScope AI — a production-grade SaaS that analyzes GitHub profiles like a recruiter. AI-powered scoring, insights, and hiring recommendations.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: Gemini AI (via Replit AI Integrations)
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
- Landing page with animated hero (3D network globe / CSS fallback), features, CTA
- Analyze page (`/analyze/:username`) — full GitHub profile analysis with animated score, charts, AI insights
- Dashboard page (`/dashboard`) — platform stats, hiring breakdown charts, recent analyses table

### Backend (`artifacts/api-server`)
- `GET /api/analyze/:username` — fetches GitHub data, computes 5-category score (0-100), generates AI insights via Gemini
- `GET /api/history` — recent analyses
- `GET /api/history/:username` — analyses for specific user
- `GET /api/stats` — platform-wide statistics
- In-memory cache (10 min TTL) for GitHub responses

### Database (`lib/db/src/schema/analyses.ts`)
- `analyses` table — stores username, score, hiring recommendation, profile/insights JSON

### Scoring Logic
- Repo Quality: 0-30 pts
- Activity Consistency: 0-25 pts
- Tech Diversity: 0-20 pts
- Popularity (stars/forks/followers): 0-15 pts
- Completeness (bio, readme, description): 0-10 pts
- Total: 0-100

### Design System — Neobrutalism
- Cream background: #FFF8E6
- Orange accent: #FF8D3F
- Thick black borders (2-4px)
- Hard box shadows (4px 4px 0 #000)
- Space Grotesk headings, Inter body
- Slight card rotations (±0.5-1.5deg)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
