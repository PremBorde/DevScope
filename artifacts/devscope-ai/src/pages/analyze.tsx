import { useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import {
  useAnalyzeGithubUser,
  getAnalyzeGithubUserQueryKey,
} from "@workspace/api-client-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ArrowLeft, Star, GitFork, Book, Users, MapPin, Calendar, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCountUp,
  useProgressBars,
  useStaggerEntrance,
  useScrollReveal,
  useCardHover,
  useBadgeEntrance,
} from "@/hooks/useAnimations";
import PageTransition from "@/components/layout/PageTransition";

function ScoreColor(score: number) {
  if (score >= 70) return "#22c55e";
  if (score >= 50) return "#FF8D3F";
  return "#ef4444";
}

function HiringBadge({ rec, animated = false }: { rec: string; animated?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useBadgeEntrance(animated ? ref : { current: null }, 0.5);
  const map: Record<string, { label: string; bg: string; shadow: string }> = {
    strong_hire: { label: "Strong Hire", bg: "bg-green-400", shadow: "shadow-[4px_4px_0_#166534]" },
    hire: { label: "Hire", bg: "bg-blue-400", shadow: "shadow-[4px_4px_0_#1e3a8a]" },
    consider: { label: "Consider", bg: "bg-yellow-300", shadow: "shadow-[4px_4px_0_#713f12]" },
    pass: { label: "Pass", bg: "bg-red-400", shadow: "shadow-[4px_4px_0_#7f1d1d]" },
  };
  const style = map[rec] ?? map["consider"];
  return (
    <span
      ref={ref}
      className={`inline-block px-4 py-2 border-2 border-black font-heading font-bold uppercase text-black text-sm will-change-transform ${style.bg} ${style.shadow}`}
    >
      {style.label}
    </span>
  );
}

const LANG_COLORS = ["#FF8D3F", "#000000", "#22c55e", "#3b82f6", "#a855f7", "#ef4444", "#f59e0b", "#06b6d4"];

function LoadingSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-12 space-y-8">
      <Skeleton className="h-12 w-64 border-2 border-black rounded-none" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 border-2 border-black rounded-none" />)}
      </div>
      <Skeleton className="h-64 border-2 border-black rounded-none" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-72 border-2 border-black rounded-none" />
        <Skeleton className="h-72 border-2 border-black rounded-none" />
      </div>
    </div>
  );
}

function AnimatedScore({ target, color }: { target: number; color: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useCountUp(ref, target, { duration: 2, delay: 0.2 });
  return <span ref={ref} style={{ color }}>0</span>;
}

export default function Analyze() {
  const params = useParams<{ username: string }>();
  const username = params.username ?? "";
  const [, setLocation] = useLocation();

  const pageRef = useRef<HTMLDivElement>(null);
  const breakdownRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const insightsRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = useAnalyzeGithubUser(username, {
    query: {
      enabled: !!username,
      queryKey: getAnalyzeGithubUserQueryKey(username),
      retry: false,
    },
  });

  useProgressBars(breakdownRef, ".gsap-bar");
  useStaggerEntrance(statsRef, ".stat-card", { stagger: 0.1, delay: 0.1 });
  useScrollReveal(pageRef, ".reveal");
  useStaggerEntrance(insightsRef, ".insight-card", { stagger: 0.12, delay: 0.05 });

  const cardHover = useCardHover();

  if (!username) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="border-4 border-black bg-white p-12 shadow-[8px_8px_0_#000] text-center">
            <h2 className="font-heading font-black text-3xl uppercase mb-4">No username provided</h2>
            <button
              onClick={() => setLocation("/")}
              className="border-2 border-black bg-primary px-6 py-3 font-bold uppercase shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] hover:-translate-y-0.5 transition-all"
            >
              Go Home
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full">
        <div className="border-b-4 border-black bg-background px-6 py-4 flex items-center gap-4">
          <div className="border-2 border-black bg-white p-2 shadow-[3px_3px_0_#000] animate-pulse">
            <div className="w-5 h-5 bg-gray-200" />
          </div>
          <span className="font-heading font-bold text-xl">
            Analyzing <span className="text-primary">@{username}</span>...
          </span>
        </div>
        <div className="px-4 py-6">
          <div className="max-w-6xl mx-auto">
            <div className="border-4 border-black bg-white p-8 shadow-[6px_6px_0_#000] mb-8 text-center">
              <div className="flex justify-center mb-5">
                <div className="w-16 h-16 border-4 border-black border-t-primary rounded-full animate-spin" />
              </div>
              <p className="font-heading font-bold text-xl uppercase">Fetching GitHub data and generating AI insights...</p>
              <p className="text-muted-foreground mt-2 font-medium">This may take 10–20 seconds</p>
            </div>
            <LoadingSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    const errMsg = (error as { message?: string })?.message ?? "Something went wrong";
    return (
      <PageTransition>
        <div className="flex items-center justify-center min-h-[60vh] px-6">
          <div className="border-4 border-black bg-white p-12 shadow-[8px_8px_0_#000] text-center max-w-lg w-full">
            <div className="border-4 border-black bg-red-400 p-4 inline-block mb-6 shadow-[4px_4px_0_#000]">
              <span className="font-heading font-black text-2xl">Error</span>
            </div>
            <p className="font-bold text-lg mb-8">{errMsg}</p>
            <button
              onClick={() => setLocation("/")}
              className="border-2 border-black bg-primary px-6 py-3 font-bold uppercase shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] hover:-translate-y-0.5 transition-all"
            >
              Try Another
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!data) return null;

  const { profile, repoStats, languageDistribution, scoreBreakdown, aiInsights, analyzedAt, cached } = data;

  const langData = Object.entries(languageDistribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, pct]) => ({ name, value: pct }));

  const scoreColor = ScoreColor(scoreBreakdown.total);

  return (
    <PageTransition>
      <div ref={pageRef} className="w-full min-h-screen bg-background">
        {/* Sticky Header */}
        <div className="border-b-4 border-black bg-background px-6 py-4 flex items-center justify-between sticky top-0 z-40">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 border-2 border-black bg-white px-4 py-2 font-bold shadow-[3px_3px_0_#000] hover:shadow-[5px_5px_0_#000] hover:-translate-y-0.5 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-3">
            {cached && (
              <span className="border-2 border-black bg-muted px-3 py-1 text-xs font-bold uppercase shadow-[2px_2px_0_#000]">
                Cached
              </span>
            )}
            <HiringBadge rec={aiInsights.hiringRecommendation} />
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 md:px-6 py-10 space-y-10">
          {/* Profile + Score */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Profile Card */}
            <div
              className="stagger-card md:col-span-2 border-4 border-black bg-white p-7 shadow-[6px_6px_0_#000] will-change-transform"
              onMouseEnter={cardHover.onMouseEnter}
              onMouseLeave={cardHover.onMouseLeave}
            >
              <div className="flex items-start gap-6">
                <img
                  src={profile.avatar_url}
                  alt={profile.login}
                  className="w-20 h-20 border-4 border-black shadow-[4px_4px_0_#000] flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h1 className="font-heading font-black text-3xl">{profile.name ?? profile.login}</h1>
                  <a
                    href={profile.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-muted-foreground font-medium hover:text-primary transition-colors"
                  >
                    @{profile.login} <ExternalLink className="w-3 h-3" />
                  </a>
                  {profile.bio && <p className="mt-2 text-sm font-medium">{profile.bio}</p>}
                  <div className="flex flex-wrap gap-4 mt-3 text-sm font-medium">
                    {profile.location && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="w-3 h-3" /> {profile.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="w-3 h-3" /> Since {new Date(profile.created_at).getFullYear()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t-2 border-black">
                <Stat icon={<Book className="w-4 h-4" />} label="Repos" value={profile.public_repos} />
                <Stat icon={<Users className="w-4 h-4" />} label="Followers" value={profile.followers} />
                <Stat icon={<Star className="w-4 h-4" />} label="Stars" value={repoStats.totalStars} />
              </div>
            </div>

            {/* Score Card */}
            <div
              className="stagger-card border-4 border-black bg-white p-7 shadow-[6px_6px_0_#000] flex flex-col items-center justify-center text-center will-change-transform"
              onMouseEnter={cardHover.onMouseEnter}
              onMouseLeave={cardHover.onMouseLeave}
            >
              <p className="font-heading font-bold uppercase text-xs tracking-widest mb-3 text-muted-foreground">Overall Score</p>
              <div className="text-9xl font-heading font-black leading-none mb-1">
                <AnimatedScore target={scoreBreakdown.total} color={scoreColor} />
              </div>
              <p className="text-xl font-bold text-muted-foreground mb-5">/ 100</p>
              <div className="w-full bg-gray-100 border-2 border-black h-5 mb-5">
                <div
                  className="gsap-bar h-full"
                  data-width={`${scoreBreakdown.total}%`}
                  style={{ backgroundColor: scoreColor, width: 0 }}
                />
              </div>
              <HiringBadge rec={aiInsights.hiringRecommendation} animated />
            </div>
          </div>

          {/* Score Breakdown + Language */}
          <div ref={breakdownRef} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              className="border-4 border-black bg-white p-7 shadow-[6px_6px_0_#000] will-change-transform"
              onMouseEnter={cardHover.onMouseEnter}
              onMouseLeave={cardHover.onMouseLeave}
            >
              <h2 className="font-heading font-black uppercase text-xl mb-5 border-b-2 border-black pb-2">Score Breakdown</h2>
              <div className="space-y-5">
                {[
                  { label: "Repo Quality", value: scoreBreakdown.repoQuality, max: 30 },
                  { label: "Activity Consistency", value: scoreBreakdown.activityConsistency, max: 25 },
                  { label: "Tech Diversity", value: scoreBreakdown.techDiversity, max: 20 },
                  { label: "Popularity", value: scoreBreakdown.popularity, max: 15 },
                  { label: "Completeness", value: scoreBreakdown.completeness, max: 10 },
                ].map(({ label, value, max }) => (
                  <div key={label}>
                    <div className="flex justify-between font-bold text-sm mb-1.5">
                      <span>{label}</span>
                      <span className="text-primary">{value}/{max}</span>
                    </div>
                    <div className="w-full bg-gray-100 border-2 border-black h-5 overflow-hidden">
                      <div
                        className="gsap-bar h-full bg-primary border-r-2 border-black"
                        data-width={`${(value / max) * 100}%`}
                        style={{ width: 0 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="border-4 border-black bg-white p-7 shadow-[6px_6px_0_#000] will-change-transform"
              onMouseEnter={cardHover.onMouseEnter}
              onMouseLeave={cardHover.onMouseLeave}
            >
              <h2 className="font-heading font-black uppercase text-xl mb-5 border-b-2 border-black pb-2">Language Distribution</h2>
              {langData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={langData}
                        cx="50%"
                        cy="50%"
                        outerRadius={68}
                        dataKey="value"
                        stroke="#000"
                        strokeWidth={2}
                        animationBegin={300}
                        animationDuration={1000}
                      >
                        {langData.map((_, i) => (
                          <Cell key={i} fill={LANG_COLORS[i % LANG_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => `${v}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {langData.map((l, i) => (
                      <span
                        key={l.name}
                        className="text-xs font-bold border border-black px-2 py-0.5"
                        style={{ backgroundColor: LANG_COLORS[i % LANG_COLORS.length], color: i === 1 ? "#fff" : "#000" }}
                      >
                        {l.name} {l.value}%
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground font-medium text-center py-8">No language data available</p>
              )}
            </div>
          </div>

          {/* Repo Stats */}
          <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Repos", value: repoStats.totalRepos, icon: <Book className="w-5 h-5" /> },
              { label: "Total Stars", value: repoStats.totalStars, icon: <Star className="w-5 h-5" /> },
              { label: "Total Forks", value: repoStats.totalForks, icon: <GitFork className="w-5 h-5" /> },
              { label: "Avg Stars/Repo", value: repoStats.avgStarsPerRepo, icon: <Star className="w-5 h-5" /> },
            ].map(({ label, value, icon }, i) => (
              <div
                key={label}
                className="stat-card border-4 border-black bg-white p-5 shadow-[4px_4px_0_#000] will-change-transform"
                style={{ transform: i % 2 === 0 ? "rotate(-0.5deg)" : "rotate(0.5deg)" }}
                onMouseEnter={cardHover.onMouseEnter}
                onMouseLeave={cardHover.onMouseLeave}
              >
                <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                  {icon}
                  <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
                </div>
                <p className="font-heading font-black text-3xl">{value.toLocaleString()}</p>
              </div>
            ))}
          </div>

          {/* AI Insights */}
          <div
            className="reveal border-4 border-black bg-white p-8 shadow-[8px_8px_0_#000]"
            onMouseEnter={cardHover.onMouseEnter}
            onMouseLeave={cardHover.onMouseLeave}
          >
            <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
              <h2 className="font-heading font-black uppercase text-2xl border-b-4 border-black pb-1 inline-block">AI Insights</h2>
              <HiringBadge rec={aiInsights.hiringRecommendation} />
            </div>
            <p className="text-muted-foreground font-medium mb-8 mt-4 italic leading-relaxed">{aiInsights.summary}</p>

            <div ref={insightsRef} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="insight-card border-2 border-black p-5 shadow-[3px_3px_0_#000] will-change-transform" style={{ transform: "rotate(-0.5deg)" }}>
                <h3 className="font-heading font-bold uppercase mb-4 border-b-2 border-black pb-1 text-green-700">Strengths</h3>
                <ul className="space-y-2.5">
                  {aiInsights.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm font-medium">
                      <span className="mt-1.5 w-2 h-2 bg-green-500 border border-black flex-shrink-0 rounded-sm" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="insight-card border-2 border-black p-5 shadow-[3px_3px_0_#000] will-change-transform" style={{ transform: "rotate(0.5deg)" }}>
                <h3 className="font-heading font-bold uppercase mb-4 border-b-2 border-black pb-1 text-red-700">Weaknesses</h3>
                <ul className="space-y-2.5">
                  {aiInsights.weaknesses.map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm font-medium">
                      <span className="mt-1.5 w-2 h-2 bg-red-500 border border-black flex-shrink-0 rounded-sm" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="insight-card border-2 border-black p-5 shadow-[3px_3px_0_#000] bg-primary/10 will-change-transform" style={{ transform: "rotate(-0.3deg)" }}>
                <h3 className="font-heading font-bold uppercase mb-4 border-b-2 border-black pb-1 text-orange-700">Suggestions</h3>
                <ul className="space-y-2.5">
                  {aiInsights.suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm font-medium">
                      <span className="mt-1.5 w-2 h-2 bg-primary border border-black flex-shrink-0 rounded-sm" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Most Starred Repo */}
          {repoStats.mostStarredRepo && (
            <div
              className="reveal border-4 border-black bg-primary p-7 shadow-[6px_6px_0_#000] flex items-center justify-between will-change-transform"
              style={{ transform: "rotate(-0.3deg)" }}
              onMouseEnter={cardHover.onMouseEnter}
              onMouseLeave={cardHover.onMouseLeave}
            >
              <div>
                <p className="font-bold uppercase text-sm tracking-widest mb-1">Most Starred Repo</p>
                <p className="font-heading font-black text-2xl">{repoStats.mostStarredRepo}</p>
              </div>
              <Star className="w-12 h-12 opacity-50" />
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center font-medium pb-4">
            Analyzed at {new Date(analyzedAt).toLocaleString()}
          </p>
        </div>
      </div>
    </PageTransition>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs font-bold uppercase tracking-wide mb-1">
        {icon} {label}
      </div>
      <p className="font-heading font-black text-2xl">{value.toLocaleString()}</p>
    </div>
  );
}
