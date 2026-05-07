# DevScope AI 🎯

> **AI-Powered GitHub Profile Analyzer & Developer Rating Platform**

DevScope AI is a production-grade, Neobrutalist SaaS application that analyzes GitHub profiles like a technical recruiter. It provides AI-powered scoring (0-100), Gemini AI insights, hiring recommendations, shareable public reports, side-by-side developer comparisons, and a 30-day actionable improvement roadmap.

![DevScope UI Preview](docs/preview.png) *(Preview placeholder)*

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
   Copy `.env.example` to `.env` in the root and configure your variables:
   ```bash
   cp .env.example .env
   ```
   *Make sure to provide your Postgres `DATABASE_URL` and `AI_INTEGRATIONS_GEMINI_API_KEY`.*

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

DevScope is ready for production environments.

1. **Build the Application**
   ```bash
   pnpm run build
   ```
   *This compiles the Express backend and builds the React frontend into `frontend/dist/public`.*

2. **Start the Production Server**
   ```bash
   pnpm --filter @workspace/api-server run start
   ```
   *The Express backend is configured to automatically serve the static React assets in production mode.*

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
