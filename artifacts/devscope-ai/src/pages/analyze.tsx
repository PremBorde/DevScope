import { useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { greeterBus } from "@/lib/greeterBus";
import gsap from "gsap";
import {
  useAnalyzeGithubUser,
  getAnalyzeGithubUserQueryKey,
  useGetAiRoadmap,
  getGetAiRoadmapQueryKey,
  usePostAiRoadmap,
} from "@workspace/api-client-react";
import type { RoadmapPhase, WeeklyRoadmap } from "@workspace/api-client-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ArrowLeft, Star, GitFork, Book, Users, MapPin, Calendar, ExternalLink, Link2, RefreshCw } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useToast } from "@/hooks/use-toast";
import {
  useCountUp,
  useProgressBars,
  useStaggerEntrance,
  useScrollReveal,
  useCardHover,
  useBadgeEntrance,
} from "@/hooks/useAnimations";
import PageTransition from "@/components/layout/PageTransition";
import WalkingLoader from "@/components/WalkingLoader";

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
  const weekPlanRef = useRef<HTMLDivElement>(null);

  // Weekly roadmap state
  const [weekChecked, setWeekChecked]     = useState<Set<string>>(new Set()); // "weekN-taskIdx"
  const [weekCollapsed, setWeekCollapsed] = useState<Set<string>>(new Set()); // "week1"..."week4"

  const {
    mutate: generateWeeklyPlan,
    data: weeklyPlan,
    isPending: weekPlanPending,
    reset: resetWeeklyPlan,
  } = usePostAiRoadmap();

  const toggleWeekCheck = (key: string) =>
    setWeekChecked((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const toggleWeekCollapse = (key: string) =>
    setWeekCollapsed((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const { data, isLoading, error } = useAnalyzeGithubUser(username, {
    query: {
      enabled: !!username,
      queryKey: getAnalyzeGithubUserQueryKey(username),
      retry: false,
    },
  });

  const { data: roadmap, isLoading: roadmapLoading } = useGetAiRoadmap(username, {
    query: {
      enabled: !!username && !!data,
      queryKey: getGetAiRoadmapQueryKey(username),
      retry: false,
      staleTime: 1000 * 60 * 15,
    },
  });

  // Mark-as-done state keyed by "phaseKey-actionIndex"
  const [checked, setChecked] = useState<Set<string>>(new Set());
  // Collapsed phases
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleCheck = (key: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const toggleCollapse = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  useProgressBars(breakdownRef, ".gsap-bar");
  useStaggerEntrance(statsRef, ".stat-card", { stagger: 0.1, delay: 0.1 });
  useScrollReveal(pageRef, ".reveal");
  useStaggerEntrance(insightsRef, ".insight-card", { stagger: 0.12, delay: 0.05 });

  const cardHover = useCardHover();
  const { toast } = useToast();

  usePageTitle(data ? `@${data.profile.login} — Score ${data.scoreBreakdown.total}/100` : username ? `Analyzing @${username}` : "Analyze");

  // Must be declared before any conditional returns to satisfy Rules of Hooks
  const langData = useMemo(
    () => {
      if (!data) return [] as { name: string; value: number }[];
      return Object.entries(data.languageDistribution)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, pct]) => ({ name, value: pct }));
    },
    [data],
  );

  const handleShareReport = async () => {
    const reportUrl = `${window.location.origin}${import.meta.env.BASE_URL}report/${username}`.replace(/\/\//g, "/").replace(":/", "://");
    try {
      await navigator.clipboard.writeText(reportUrl);
      toast({ title: "Report link copied!", description: `Share /report/${username} with anyone — no login required.` });
      greeterBus.emit({ type: "celebrate", msg: "Link copied! 📎" });
    } catch {
      toast({ title: "Copy failed", description: "Please copy the URL manually.", variant: "destructive" });
    }
  };

  // Notify greeter character with score when analysis data first loads
  const scoreSentRef = useRef(false);
  useEffect(() => {
    if (data && !scoreSentRef.current) {
      scoreSentRef.current = true;
      greeterBus.emit({ type: "score", score: data.scoreBreakdown.total });
    }
  }, [data]);

  // Error empathy — character reacts when API call fails
  const errorSentRef = useRef(false);
  useEffect(() => {
    if (error && !errorSentRef.current) {
      errorSentRef.current = true;
      greeterBus.emit({ type: "error", msg: "Hmm, couldn't find them! 🤔" });
    }
  }, [error]);

  // Auto-generate weekly plan once analysis data is ready
  useEffect(() => {
    if (data && !weeklyPlan && !weekPlanPending) {
      generateWeeklyPlan({
        data: {
          username,
          score: data.scoreBreakdown.total,
          breakdown: data.scoreBreakdown as unknown as Record<string, number>,
          weaknesses: data.aiInsights.weaknesses,
          strengths: data.aiInsights.strengths,
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // GSAP stagger cards when weeklyPlan data arrives
  useEffect(() => {
    if (!weeklyPlan || !weekPlanRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        weekPlanRef.current!.querySelectorAll(".week-card"),
        { y: 44, opacity: 0, scale: 0.95 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.5,
          stagger: 0.13,
          ease: "power3.out",
          clearProps: "scale,opacity",
        }
      );
    }, weekPlanRef);
    return () => ctx.revert();
  }, [weeklyPlan]);

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
    return <WalkingLoader username={username} />;
  }

  if (error) {
    const errMsg    = (error as { message?: string })?.message ?? "Something went wrong";
    const isNotFound  = errMsg.toLowerCase().includes("not found");
    const isRateLimit = errMsg.toLowerCase().includes("rate limit");
    return (
      <PageTransition>
        <div className="flex items-center justify-center min-h-[60vh] px-6">
          <div className="border-4 border-black bg-white p-10 md:p-14 shadow-[8px_8px_0_#000] text-center max-w-lg w-full">
            <div className={`border-4 border-black p-4 inline-block mb-6 shadow-[4px_4px_0_#000] text-4xl ${isNotFound ? "bg-yellow-300" : isRateLimit ? "bg-orange-300" : "bg-red-400"}`}>
              {isNotFound ? "🔍" : isRateLimit ? "⏱️" : "⚠️"}
            </div>
            <h2 className="font-heading font-black text-2xl uppercase mb-3">
              {isNotFound ? "User Not Found" : isRateLimit ? "Rate Limited" : "Something Went Wrong"}
            </h2>
            <p className="font-medium text-muted-foreground mb-2">
              {isNotFound
                ? `GitHub user @${username} doesn't exist or is not accessible.`
                : isRateLimit
                ? "GitHub's API rate limit was hit. Please wait a moment and try again."
                : errMsg}
            </p>
            {isRateLimit && (
              <p className="text-sm font-semibold text-orange-600 mb-6">Rate limits reset every 60 minutes.</p>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
              {!isNotFound && (
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center justify-center gap-2 border-2 border-black bg-primary px-6 py-3 font-bold uppercase shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] hover:-translate-y-0.5 transition-all"
                >
                  <RefreshCw className="w-4 h-4" /> Retry
                </button>
              )}
              <button
                onClick={() => setLocation("/")}
                className="border-2 border-black bg-white px-6 py-3 font-bold uppercase shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] hover:-translate-y-0.5 transition-all"
              >
                Try Another
              </button>
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!data) return null;

  const { profile, repoStats, languageDistribution, scoreBreakdown, aiInsights, analyzedAt, cached } = data;

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
          <div className="flex items-center gap-2 md:gap-3">
            {cached && (
              <span className="border-2 border-black bg-muted px-3 py-1 text-xs font-bold uppercase shadow-[2px_2px_0_#000] hidden sm:inline">
                Cached
              </span>
            )}
            <button
              onClick={handleShareReport}
              title="Copy shareable report link"
              className="flex items-center gap-1.5 border-2 border-black bg-white px-3 py-1.5 text-xs font-bold uppercase shadow-[2px_2px_0_#000] hover:shadow-[4px_4px_0_#000] hover:-translate-y-0.5 transition-all"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share</span>
            </button>
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

          {/* ── AI Improvement Roadmap ── */}
          <div className="reveal border-4 border-black bg-white shadow-[8px_8px_0_#000]">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-5 border-b-4 border-black">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-primary">Gemini AI</span>
                <h2 className="font-heading font-black uppercase text-2xl mt-0.5 flex items-center gap-2">
                  🗺️ Your Action Plan
                </h2>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Target score</p>
                <p className="font-heading font-black text-2xl text-primary">
                  {Math.min(100, (scoreBreakdown.total ?? 0) + 20)}+
                </p>
              </div>
            </div>

            {roadmapLoading || !roadmap ? (
              <div className="p-8 space-y-4">
                {roadmapLoading ? (
                  <>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-5 h-5 border-4 border-black border-t-primary rounded-full animate-spin" />
                      <span className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Generating your personalized roadmap…</span>
                    </div>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-20 border-2 border-black bg-gray-50 animate-pulse" />
                    ))}
                  </>
                ) : (
                  <p className="text-muted-foreground font-medium text-center py-8">Roadmap not available. Analyze the profile first.</p>
                )}
              </div>
            ) : (
              <div className="p-6 md:p-8">
                {/* Timeline */}
                <div className="space-y-0">
                  {(
                    [
                      {
                        key: "immediate",
                        phase: roadmap.immediate,
                        icon: "⚠️",
                        badge: "NOW",
                        badgeBg: "bg-red-400",
                        connectorColor: "bg-red-400",
                        borderAccent: "border-l-red-400",
                        headerBg: "bg-red-50",
                      },
                      {
                        key: "shortTerm",
                        phase: roadmap.shortTerm,
                        icon: "🚀",
                        badge: "SOON",
                        badgeBg: "bg-primary",
                        connectorColor: "bg-primary",
                        borderAccent: "border-l-primary",
                        headerBg: "bg-orange-50",
                      },
                      {
                        key: "midTerm",
                        phase: roadmap.midTerm,
                        icon: "✅",
                        badge: "NEXT",
                        badgeBg: "bg-blue-400",
                        connectorColor: "bg-blue-400",
                        borderAccent: "border-l-blue-400",
                        headerBg: "bg-blue-50",
                      },
                      {
                        key: "longTerm",
                        phase: roadmap.longTerm,
                        icon: "⭐",
                        badge: "LATER",
                        badgeBg: "bg-purple-400",
                        connectorColor: "bg-purple-400",
                        borderAccent: "border-l-purple-400",
                        headerBg: "bg-purple-50",
                      },
                    ] as Array<{
                      key: string;
                      phase: RoadmapPhase;
                      icon: string;
                      badge: string;
                      badgeBg: string;
                      connectorColor: string;
                      borderAccent: string;
                      headerBg: string;
                    }>
                  ).map(({ key, phase, icon, badge, badgeBg, connectorColor, borderAccent, headerBg }, phaseIdx, arr) => {
                    const isCollapsed = collapsed.has(key);
                    const doneCount = phase.actions.filter((_, i) => checked.has(`${key}-${i}`)).length;
                    const allDone = doneCount === phase.actions.length && phase.actions.length > 0;

                    return (
                      <div key={key} className="relative flex gap-4 md:gap-6">
                        {/* Timeline spine */}
                        <div className="flex flex-col items-center flex-shrink-0 w-10">
                          {/* Dot */}
                          <div
                            className={`w-10 h-10 border-4 border-black flex items-center justify-center text-lg font-bold flex-shrink-0 shadow-[3px_3px_0_#000] z-10 ${allDone ? "bg-green-400" : badgeBg}`}
                          >
                            {allDone ? "✓" : icon}
                          </div>
                          {/* Connector line */}
                          {phaseIdx < arr.length - 1 && (
                            <div className={`w-1 flex-1 min-h-6 ${connectorColor} opacity-40`} />
                          )}
                        </div>

                        {/* Phase card */}
                        <div className={`flex-1 mb-6 border-4 border-black shadow-[4px_4px_0_#000] border-l-8 ${borderAccent} overflow-hidden`}>
                          {/* Phase header — clickable to collapse */}
                          <button
                            onClick={() => toggleCollapse(key)}
                            className={`w-full flex items-center justify-between px-5 py-3.5 ${headerBg} hover:brightness-95 transition-all text-left`}
                          >
                            <div className="flex items-center gap-3">
                              <span className={`px-2 py-0.5 border-2 border-black text-xs font-black uppercase tracking-widest ${badgeBg} text-black`}>
                                {badge}
                              </span>
                              <div>
                                <p className="font-heading font-black uppercase text-base leading-tight">{phase.label}</p>
                                <p className="text-xs font-semibold text-muted-foreground">{phase.timeframe}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              {/* Progress */}
                              <span className="text-xs font-black uppercase tracking-wide">
                                {doneCount}/{phase.actions.length} done
                              </span>
                              {/* Chevron */}
                              <span className={`text-xs font-black transition-transform duration-200 ${isCollapsed ? "rotate-0" : "rotate-180"}`}>
                                ▼
                              </span>
                            </div>
                          </button>

                          {/* Actions list */}
                          {!isCollapsed && (
                            <ul className="divide-y-2 divide-black">
                              {phase.actions.map((action, actionIdx) => {
                                const ck = `${key}-${actionIdx}`;
                                const isDone = checked.has(ck);
                                const priorityConfig = {
                                  high:   { label: "HIGH",   cls: "bg-red-400   text-black" },
                                  medium: { label: "MED",    cls: "bg-yellow-300 text-black" },
                                  low:    { label: "LOW",    cls: "bg-green-400  text-black" },
                                }[action.priority] ?? { label: "MED", cls: "bg-yellow-300 text-black" };

                                return (
                                  <li
                                    key={actionIdx}
                                    className={`flex items-center gap-4 px-5 py-3.5 transition-colors ${isDone ? "bg-green-50" : "bg-white hover:bg-gray-50"}`}
                                  >
                                    {/* Mark as Done checkbox */}
                                    <button
                                      onClick={() => toggleCheck(ck)}
                                      aria-label={isDone ? "Mark as not done" : "Mark as done"}
                                      className={`w-6 h-6 border-2 border-black flex-shrink-0 flex items-center justify-center transition-all shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] hover:-translate-y-0.5 ${
                                        isDone ? "bg-green-400" : "bg-white"
                                      }`}
                                    >
                                      {isDone && <span className="text-xs font-black">✓</span>}
                                    </button>

                                    {/* Action text */}
                                    <span
                                      className={`flex-1 font-semibold text-sm leading-snug ${isDone ? "line-through text-muted-foreground" : ""}`}
                                    >
                                      {action.text}
                                    </span>

                                    {/* Priority badge */}
                                    <span className={`flex-shrink-0 text-xs font-black border border-black px-1.5 py-0.5 uppercase tracking-wide ${priorityConfig.cls}`}>
                                      {priorityConfig.label}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Progress summary bar */}
                {(() => {
                  const total = [roadmap.immediate, roadmap.shortTerm, roadmap.midTerm, roadmap.longTerm]
                    .flatMap((p) => p.actions).length;
                  const done = [...checked].length;
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                  return (
                    <div className="mt-2 border-2 border-black p-4 bg-background">
                      <div className="flex justify-between font-bold text-sm mb-2 uppercase tracking-wide">
                        <span>Overall Progress</span>
                        <span className="text-primary">{done}/{total} actions complete — {pct}%</span>
                      </div>
                      <div className="w-full h-4 bg-gray-100 border-2 border-black overflow-hidden">
                        <div
                          className="h-full bg-primary border-r-2 border-black transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* ── Your 30-Day Improvement Plan ────────────────────────── */}
          {(() => {
            const weeks: Array<{ key: keyof WeeklyRoadmap & `week${number}`; label: string; emoji: string; accentBg: string; accentBorder: string; headerBg: string; badgeBg: string }> = [
              { key: "week1", label: "Week 1", emoji: "🔥", accentBg: "bg-red-400",    accentBorder: "border-l-red-400",    headerBg: "bg-red-50",    badgeBg: "bg-red-400" },
              { key: "week2", label: "Week 2", emoji: "🚀", accentBg: "bg-primary",    accentBorder: "border-l-primary",    headerBg: "bg-orange-50", badgeBg: "bg-primary" },
              { key: "week3", label: "Week 3", emoji: "✅", accentBg: "bg-blue-400",   accentBorder: "border-l-blue-400",   headerBg: "bg-blue-50",   badgeBg: "bg-blue-400" },
              { key: "week4", label: "Week 4", emoji: "⭐", accentBg: "bg-purple-400", accentBorder: "border-l-purple-400", headerBg: "bg-purple-50", badgeBg: "bg-purple-400" },
            ];

            // Determine current week from generatedAt
            const currentWeekIdx = weeklyPlan
              ? Math.min(Math.floor((Date.now() - new Date(weeklyPlan.generatedAt).getTime()) / (7 * 24 * 60 * 60 * 1000)), 3)
              : 0;

            return (
              <div className="reveal border-4 border-black bg-white shadow-[6px_6px_0_#000]">
                {/* Section header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-7 pt-7 pb-5 border-b-2 border-black">
                  <div>
                    <span className="text-xs font-black uppercase tracking-widest text-primary border-b-2 border-primary pb-0.5">Gemini AI</span>
                    <h2 className="font-heading font-black uppercase text-2xl mt-1">📅 Your 30-Day Improvement Plan</h2>
                    <p className="text-sm text-muted-foreground font-medium mt-0.5">
                      Brutally specific weekly tasks, personalized for @{username}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      resetWeeklyPlan();
                      generateWeeklyPlan({
                        data: {
                          username,
                          score: data?.scoreBreakdown.total ?? 0,
                          breakdown: data?.scoreBreakdown as unknown as Record<string, number>,
                          weaknesses: data?.aiInsights.weaknesses ?? [],
                          strengths: data?.aiInsights.strengths ?? [],
                          regenerate: true,
                        },
                      });
                    }}
                    disabled={weekPlanPending}
                    className="flex-shrink-0 flex items-center gap-2 border-2 border-black bg-white px-5 py-2.5 font-black uppercase text-sm shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0_#000]"
                  >
                    {weekPlanPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black border-t-primary rounded-full animate-spin" />
                        Generating…
                      </>
                    ) : (
                      <>🔄 Regenerate</>
                    )}
                  </button>
                </div>

                <div className="px-7 pb-7 pt-5">
                  {weekPlanPending ? (
                    /* Loading skeleton */
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-6 h-6 border-2 border-black border-t-primary rounded-full animate-spin flex-shrink-0" />
                        <p className="font-bold text-sm uppercase tracking-wide text-muted-foreground">
                          Gemini AI is crafting your personalised plan…
                        </p>
                      </div>
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-24 border-4 border-black bg-gray-50 animate-pulse shadow-[4px_4px_0_#000]" style={{ opacity: 1 - i * 0.15 }} />
                      ))}
                    </div>
                  ) : weeklyPlan ? (
                    /* Week cards */
                    <div ref={weekPlanRef} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {weeks.map(({ key, label, emoji, accentBorder, headerBg, badgeBg }, weekIdx) => {
                        const tasks: string[] = (weeklyPlan[key] as string[]) ?? [];
                        const isCurrentWeek = weekIdx === currentWeekIdx;
                        const isCollapsed   = weekCollapsed.has(key);
                        const doneCount     = tasks.filter((_, ti) => weekChecked.has(`${key}-${ti}`)).length;
                        const allDone       = doneCount === tasks.length && tasks.length > 0;

                        return (
                          <div
                            key={key}
                            className={`week-card border-4 border-black shadow-[4px_4px_0_#000] border-l-8 ${accentBorder} overflow-hidden will-change-transform relative`}
                            onMouseEnter={cardHover.onMouseEnter}
                            onMouseLeave={cardHover.onMouseLeave}
                            style={{ opacity: 0 }}
                          >
                            {/* Current-week badge */}
                            {isCurrentWeek && (
                              <div className="absolute top-3 right-3 px-2 py-0.5 bg-black text-white text-xs font-black uppercase tracking-widest border border-white z-10">
                                Current
                              </div>
                            )}

                            {/* Card header — clickable to collapse */}
                            <button
                              onClick={() => toggleWeekCollapse(key)}
                              className={`w-full flex items-center justify-between px-5 py-4 ${isCurrentWeek ? "bg-black text-white" : headerBg} hover:brightness-95 transition-all text-left`}
                            >
                              <div className="flex items-center gap-3">
                                <span className={`w-9 h-9 border-2 ${isCurrentWeek ? "border-white bg-white text-black" : "border-black " + badgeBg} flex items-center justify-center text-lg font-black flex-shrink-0`}>
                                  {allDone ? "✓" : emoji}
                                </span>
                                <div>
                                  <p className={`font-heading font-black uppercase text-lg leading-tight ${isCurrentWeek ? "text-white" : "text-black"}`}>
                                    {label}
                                  </p>
                                  <p className={`text-xs font-semibold ${isCurrentWeek ? "text-white/70" : "text-muted-foreground"}`}>
                                    {doneCount}/{tasks.length} tasks done
                                  </p>
                                </div>
                              </div>
                              <span className={`text-xs font-black transition-transform duration-200 ${isCurrentWeek ? "text-white" : ""} ${isCollapsed ? "rotate-0" : "rotate-180"}`}>
                                ▼
                              </span>
                            </button>

                            {/* Task list */}
                            {!isCollapsed && (
                              <ul className="divide-y-2 divide-black">
                                {tasks.map((task, ti) => {
                                  const ck     = `${key}-${ti}`;
                                  const isDone = weekChecked.has(ck);
                                  return (
                                    <li
                                      key={ti}
                                      className={`flex items-start gap-4 px-5 py-4 transition-colors ${isDone ? "bg-green-50" : "bg-white hover:bg-gray-50"}`}
                                    >
                                      {/* Checkbox */}
                                      <button
                                        onClick={() => toggleWeekCheck(ck)}
                                        aria-label={isDone ? "Mark incomplete" : "Mark complete"}
                                        className={`mt-0.5 w-6 h-6 border-2 border-black flex-shrink-0 flex items-center justify-center transition-all shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] hover:-translate-y-0.5 ${isDone ? "bg-green-400" : "bg-white"}`}
                                      >
                                        {isDone && <span className="text-xs font-black">✓</span>}
                                      </button>
                                      {/* Task text */}
                                      <span className={`flex-1 font-semibold text-sm leading-snug ${isDone ? "line-through text-muted-foreground" : ""}`}>
                                        {task}
                                      </span>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}

                            {/* Mini progress bar */}
                            <div className="w-full h-1.5 bg-gray-100">
                              <div
                                className="h-full bg-green-400 transition-all duration-500"
                                style={{ width: tasks.length > 0 ? `${(doneCount / tasks.length) * 100}%` : "0%" }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-10 text-center text-muted-foreground font-medium">
                      <p>Could not generate plan. Try regenerating.</p>
                    </div>
                  )}

                  {/* Overall progress */}
                  {weeklyPlan && (() => {
                    const allTasks   = weeks.flatMap(({ key }) => (weeklyPlan[key] as string[]) ?? []);
                    const totalCount = allTasks.length;
                    const doneCount  = weeks.flatMap(({ key }, wi) =>
                      ((weeklyPlan[key] as string[]) ?? []).map((_, ti) => `week${wi + 1}-${ti}`)
                    ).filter((ck) => weekChecked.has(ck)).length;
                    const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
                    return (
                      <div className="mt-5 border-2 border-black p-4 bg-background">
                        <div className="flex justify-between font-bold text-sm mb-2 uppercase tracking-wide">
                          <span>30-Day Progress</span>
                          <span className="text-primary">{doneCount}/{totalCount} tasks — {pct}%</span>
                        </div>
                        <div className="w-full h-4 bg-gray-100 border-2 border-black overflow-hidden">
                          <div
                            className="h-full bg-primary border-r-2 border-black transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        {pct === 100 && (
                          <p className="text-center font-black text-green-600 uppercase tracking-widest text-xs mt-2">
                            🎉 30-Day plan complete! Time to re-analyze.
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  {weeklyPlan && (
                    <p className="text-xs text-muted-foreground text-right mt-3 font-medium">
                      Generated {new Date(weeklyPlan.generatedAt).toLocaleString()}
                      {weeklyPlan.cached && " (cached)"}
                    </p>
                  )}
                </div>
              </div>
            );
          })()}

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

          {/* ── Share this report CTA ──────────────────────────────────── */}
          <div className="reveal border-4 border-black bg-black text-white p-7 shadow-[8px_8px_0_0_#FF8D3F] flex flex-col sm:flex-row items-center justify-between gap-5">
            <div>
              <p className="font-heading font-black text-xl uppercase">Share this report</p>
              <p className="text-sm text-white/60 font-medium mt-1">
                Anyone with the link can view a public, read-only snapshot — no login required.
              </p>
            </div>
            <div className="flex gap-3 flex-shrink-0 flex-wrap">
              {typeof navigator !== "undefined" && "share" in navigator && (
                <button
                  onClick={async () => {
                    const reportUrl = `${window.location.origin}/report/${username}`;
                    await navigator.share({
                      title: `${profile.name ?? username} — DevScope AI Report`,
                      text: `Check out @${username}'s GitHub profile scored ${scoreBreakdown.total}/100 by DevScope AI.`,
                      url: reportUrl,
                    }).catch(() => {/* dismissed */});
                  }}
                  className="flex items-center gap-2 border-2 border-white bg-transparent text-white px-4 py-2.5 font-bold text-sm uppercase hover:bg-white hover:text-black transition-all"
                >
                  <Link2 className="w-4 h-4" />
                  Share
                </button>
              )}
              <button
                onClick={handleShareReport}
                className="flex items-center gap-2 border-2 border-white bg-transparent text-white px-4 py-2.5 font-bold text-sm uppercase hover:bg-white hover:text-black transition-all"
              >
                <Link2 className="w-4 h-4" />
                Copy Link
              </button>
              <button
                onClick={() => setLocation(`/report/${username}`)}
                className="flex items-center gap-2 border-2 border-primary bg-primary text-black px-5 py-2.5 font-bold text-sm uppercase shadow-[3px_3px_0_#FF8D3F] hover:shadow-[5px_5px_0_#FF8D3F] hover:-translate-y-0.5 transition-all"
              >
                View Report
                <Link2 className="w-4 h-4" />
              </button>
            </div>
          </div>

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
