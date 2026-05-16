# DevScope AI 🎯

> **AI-Powered GitHub Profile Analyzer & Developer Rating Platform**

DevScope AI is a production-grade, Neobrutalist SaaS application that analyzes GitHub profiles like a technical recruiter. It provides AI-powered scoring (0-100), Gemini AI insights, hiring recommendations, shareable public reports, side-by-side developer comparisons, and a 30-day actionable improvement roadmap.

## ✨ Key Features

- **GitHub Profile Scoring (0-100):** Deterministic scoring across 5 key categories (Repo Quality, Activity, Tech Diversity, Popularity, and Completeness).
- **Gemini AI Insights:** Generates strengths, weaknesses, a comprehensive summary, and hiring recommendations based on raw profile metrics.
- **Shareable Public Reports:** Create permanent, bookmarkable snapshots of analyses.
- **Side-by-Side Comparisons:** Compare two GitHub profiles directly, complete with an AI verdict and metric-by-metric breakdown.
- **Improvement Roadmap:** Generates an AI-driven, 30-day weekly improvement plan tailored to the user's weaknesses.
- **Neobrutalist UI:** A premium, dynamic, and responsive React-based interface utilizing Framer Motion and GSAP for fluid animations.
- **Robust Caching & Performance:** Leverages Redis for caching API responses to ensure lightning-fast subsequent loads and side-step GitHub API rate limits.
- **Authentication:** Optional GitHub OAuth login with persistent database sessions.

## 🏗️ Architecture & Tech Stack

DevScope is built as a highly scalable `pnpm` monorepo.

**Frontend:**
- **Framework:** React 18 + Vite
- **Styling:** Tailwind CSS + custom Neobrutalist design tokens
- **Components:** shadcn/ui + Radix UI
- **Animations:** Framer Motion + GSAP ScrollTrigger
- **Data Fetching:** React Query (`@tanstack/react-query`) + Wouter

**Backend:**
- **Framework:** Express.js 5 + Node.js
- **Database:** PostgreSQL + Drizzle ORM
- **Caching:** Redis (`ioredis`) with in-memory fallback
- **Validation:** Zod (`zod/v4`)
- **AI Integration:** Google Gemini (`gemini-3-flash-preview`)
- **Auth:** Passport.js (GitHub Strategy) + `connect-pg-simple` for session persistence

## 📂 Project Structure

```
.
├── backend/                  # Express API Server
│   ├── src/
│   │   ├── controllers/      # Route logic
│   │   ├── services/         # Business logic (GitHub fetching, AI, Scoring)
│   │   └── middleware/       # Rate limiting, Error Handling, Auth guards
├── frontend/                 # React UI Client
│   ├── src/
│   │   ├── pages/            # Application routes (Analyze, Compare, Dashboard)
│   │   ├── components/       # Reusable UI elements (Neobrutalist theme)
│   │   └── hooks/            # Custom logic hooks
├── shared/                   # Shared Monorepo Packages
│   ├── db/                   # Drizzle ORM Schema & Migrations
│   ├── api-zod/              # Shared Zod schemas for request validation
│   └── integrations-gemini/  # Configured AI services
└── pnpm-workspace.yaml       # Monorepo configuration
```

## 🚀 Getting Started

### Prerequisites
- Node.js v24+
- `pnpm` v9+
- PostgreSQL database
- Redis (optional but recommended)
- GitHub OAuth App (for login, optional)
- Gemini API Key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/PremBorde/DevScope.git
   cd DevScope
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Environment Setup**
   Copy the examples and configure variables (you can use a root `.env` for local convenience, or `frontend/.env` and `backend/.env` separately):
   ```bash
   cp .env.example .env
   cp frontend/.env.example frontend/.env
   cp backend/.env.example backend/.env
   ```
   Provide at least `DATABASE_URL`, `AI_INTEGRATIONS_GEMINI_BASE_URL`, and `AI_INTEGRATIONS_GEMINI_API_KEY` (or `GEMINI_API_KEY` as an alias). For split local testing (Vite + API), set `VITE_API_URL=http://127.0.0.1:3001` in `frontend/.env`, `ALLOWED_ORIGINS=http://localhost:5173`, and `FRONTEND_URL=http://localhost:5173` in `backend/.env`.

4. **Database Migrations**
   Push the schema to your PostgreSQL database:
   ```bash
   pnpm --filter @workspace/db run push
   ```

### Running Locally

Run both the frontend and backend concurrently:
```bash
pnpm run dev
```

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001

## 🚢 Production Deployment

Two supported layouts:

| Mode | When to use |
|------|-------------|
| **Combined** | Single host: Express serves the Vite build from `frontend/dist/public` when `NODE_ENV=production`. Leave `VITE_API_URL` empty in the frontend build. |
| **Split** | Frontend on Vercel, API on Render or Railway. Set `VITE_API_URL` to the public API origin. Configure API `ALLOWED_ORIGINS` and `FRONTEND_URL`. |

### Environment variables

**Frontend (Vercel / build-time)**

| Variable | Required (split) | Description |
|----------|------------------|-------------|
| `VITE_API_URL` | Yes | Public API origin, no trailing slash (e.g. `https://api.example.com`). Empty for combined mode or local dev with the Vite proxy. |

**Backend (Render / Railway / any Node host)**

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `production` |
| `PORT` | Usually auto | Host-provided listen port (e.g. Render injects `PORT`). |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Long random secret for signed cookies |
| `REDIS_URL` | No | Redis URL; omit to use in-memory cache fallback |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | No | Enables GitHub OAuth |
| `GITHUB_CALLBACK_URL` | If OAuth | Must be `https://<api-host>/api/auth/github/callback` |
| `GITHUB_TOKEN` | No | Higher GitHub API rate limits |
| `AI_INTEGRATIONS_GEMINI_BASE_URL` / `AI_INTEGRATIONS_GEMINI_API_KEY` | For AI | Or set `GEMINI_API_KEY` only as a key alias |
| `ALLOWED_ORIGINS` | Split deploy | Comma-separated browser origins allowed for CORS (e.g. `https://app.vercel.app`) |
| `FRONTEND_URL` | Split deploy | SPA origin for OAuth redirects, no trailing slash |
| `ENABLE_DEBUG_SCORE` | No | Set `true` only if you need `/api/debug-score` in production |

**Trust proxy:** The API uses `trust proxy` with hop count `1`. If rate limiting or IP logging looks wrong behind your host, check your provider’s reverse-proxy docs and adjust if needed.

### Vercel (frontend)

- Connect the **repository root** so `pnpm` can resolve `workspace:*` packages. The repo includes [`vercel.json`](vercel.json) with install/build commands, `outputDirectory: frontend/dist/public`, and SPA rewrites.
- Set `VITE_API_URL` in the Vercel project environment to your deployed API URL.

### Render or Railway (backend)

- **Render:** [`render.yaml`](render.yaml) defines a web service with `pnpm` install/build/start. Add Postgres and Redis in the dashboard and wire `DATABASE_URL` / `REDIS_URL`.
- **Railway:** [`railway.json`](railway.json) mirrors the same build and start commands; configure the same env vars in the service.

### Combined-mode build and run

1. **Build**
   ```bash
   pnpm run build
   ```
   Compiles the Express backend and builds the React app into `frontend/dist/public`.

2. **Start**
   ```bash
   pnpm --filter @workspace/api-server run start
   ```
   With `NODE_ENV=production` and the frontend build present, Express serves the SPA and `/api` on one origin.

## ⚖️ Scoring Methodology

The 0-100 score is deterministically calculated using:
- **Repo Quality (30%):** Stars, documentation, and commit recency.
- **Activity (25%):** Ratio of active repositories and days since the last commit.
- **Tech Diversity (20%):** Distinct languages and specialization bonuses.
- **Popularity (15%):** Follower-to-following ratio, total forks, and overall stars.
- **Completeness (10%):** Profile bio, avatar presence, and README existence.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/PremBorde/DevScope/issues).

## 📝 License

This project is licensed under the MIT License.
