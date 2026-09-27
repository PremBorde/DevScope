import { useParams, useLocation } from "wouter";
import { useEffect, useMemo, useRef, useState } from "react";
import { greeterBus } from "@/lib/greeterBus";
import gsap from "gsap";
import {
  useAnalyzeGithubUser,
  getAnalyzeGithubUserQueryKey,
  usePostAiRoadmap,
} from "@workspace/api-client-react";
import type { WeeklyRoadmap } from "@workspace/api-client-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ArrowLeft,
  Star,
  GitFork,
  Book,
  Users,
  MapPin,
  Calendar,
  ExternalLink,
  Link2,
  RefreshCw,
  Copy,
  Check,
  Sparkles,
  MessageSquare,
  Briefcase,
  Award,
  ChevronDown,
  Layers,
  Code2,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
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
import { apiUrl, getAuthHeaders } from "@/hooks/useAuth";

function ScoreColor(score: number) {
  if (score >= 70) return "#16a34a"; // Green
  if (score >= 50) return "#f59e0b"; // Amber/Orange
  return "#dc2626"; // Red
}

function getGradeTier(score: number) {
  if (score >= 85) return { grade: "Tier A", desc: "Top 10% · Strong Hire", bg: "bg-green-400" };
  if (score >= 70) return { grade: "Tier B", desc: "Top 25% · Hire", bg: "bg-blue-400" };
  if (score >= 50) return { grade: "Tier C", desc: "Top 50% · Consider", bg: "bg-yellow-300" };
  return { grade: "Tier D", desc: "Developing Candidate", bg: "bg-red-400" };
}

function HiringBadge({ rec, animated = false }: { rec: string; animated?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useBadgeEntrance(animated ? ref : { current: null }, 0.5);
  const map: Record<string, { label: string; bg: string }> = {
    strong_hire: { label: "Strong Hire", bg: "bg-green-400 text-black" },
    hire: { label: "Hire", bg: "bg-blue-400 text-black" },
    consider: { label: "Consider", bg: "bg-yellow-300 text-black" },
    pass: { label: "Pass", bg: "bg-red-400 text-black" },
  };
  const style = map[rec] ?? map["consider"];
  return (
    <span
      ref={ref}
      className={`inline-block px-3 py-1 border-2 border-black font-heading font-black uppercase text-xs shadow-[2px_2px_0_#000] tracking-wider will-change-transform ${style.bg}`}
    >
      {style.label}
    </span>
  );
}

const LANG_COLORS = ["#FF8D3F", "#000000", "#16a34a", "#2563eb", "#9333ea", "#dc2626", "#d97706", "#0891b2"];

function AnimatedScore({ target, color }: { target: number; color: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useCountUp(ref, target, { duration: 1.8, delay: 0.1 });
  return <span ref={ref} style={{ color }}>0</span>;
}

export type TargetRole = "fullstack" | "backend" | "ai_ml" | "frontend" | "devops" | "open_source";

const ROLE_OPTIONS: { id: TargetRole; label: string; icon: string }[] = [
  { id: "fullstack", label: "Full-Stack", icon: "🌐" },
  { id: "backend", label: "Backend & Systems", icon: "⚡" },
  { id: "ai_ml", label: "AI & Machine Learning", icon: "🤖" },
  { id: "frontend", label: "Frontend & UI", icon: "🎨" },
  { id: "devops", label: "DevOps & Cloud", icon: "☁️" },
  { id: "open_source", label: "Open Source Creator", icon: "🚀" },
];

export default function Analyze() {
  const params = useParams<{ username: string }>();
  const username = params.username ?? "";
  const [, setLocation] = useLocation();

  const pageRef = useRef<HTMLDivElement>(null);
  const breakdownRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const insightsRef = useRef<HTMLDivElement>(null);
  const weekPlanRef = useRef<HTMLDivElement>(null);

  // Toolkit tab selector
  const [activeToolkitTab, setActiveToolkitTab] = useState<"badge" | "interview" | "resume">("badge");

  // Target role selection for roadmap
  const [targetRole, setTargetRole] = useState<TargetRole>("fullstack");

  // Weekly roadmap state
  const [weekChecked, setWeekChecked]     = useState<Set<string>>(new Set());
  const [weekCollapsed, setWeekCollapsed] = useState<Set<string>>(new Set());

  // Embed Badge state
  const [badgeCopied, setBadgeCopied] = useState(false);

  // Recruiter Interview Questions state
  const [interviewQuestions, setInterviewQuestions] = useState<any[]>([]);
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [interviewExpanded, setInterviewExpanded] = useState<number | null>(0);

  // Resume Bullets state
  const [resumeBullets, setResumeBullets] = useState<any[]>([]);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [copiedBulletIdx, setCopiedBulletIdx] = useState<number | null>(null);

  const {
    mutate: generateWeeklyPlan,
    data: weeklyPlan,
    isPending: weekPlanPending,
    reset: resetWeeklyPlan,
  } = usePostAiRoadmap();

  const { data, isLoading, error } = useAnalyzeGithubUser(username, {
    query: {
      enabled: !!username,
      queryKey: getAnalyzeGithubUserQueryKey(username),
      retry: false,
    },
  });

  const cardHover = useCardHover();
  const { toast } = useToast();

  useProgressBars(breakdownRef, ".gsap-bar");
  useStaggerEntrance(statsRef, ".stat-card", { stagger: 0.08, delay: 0.05 });
  useScrollReveal(pageRef, ".reveal");
  useStaggerEntrance(insightsRef, ".insight-card", { stagger: 0.1, delay: 0.05 });

  usePageTitle(data ? `@${data.profile.login} — Score ${data.scoreBreakdown.total}/100` : username ? `Analyzing @${username}` : "Analyze");

  // Load persisted roadmap progress on mount or username change
  useEffect(() => {
    if (!username) return;
    try {
      const saved = localStorage.getItem(`devscope_roadmap_${username.toLowerCase()}`);
      if (saved) {
        setWeekChecked(new Set(JSON.parse(saved)));
      }
    } catch {
      // ignore
    }

    fetch(apiUrl(`/api/ai/progress/${username.toLowerCase()}`))
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (res?.checked && Array.isArray(res.checked)) {
          setWeekChecked((prev) => new Set([...prev, ...res.checked]));
        }
      })
      .catch(() => {});
  }, [username]);

  // Toggle checklist item with persistence
  const toggleWeekCheck = (key: string) => {
    setWeekChecked((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      const arr = [...next];
      try {
        localStorage.setItem(`devscope_roadmap_${username.toLowerCase()}`, JSON.stringify(arr));
      } catch {
        // ignore
      }

      fetch(apiUrl(`/api/ai/progress/${username.toLowerCase()}`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ checked: arr }),
      }).catch(() => {});

      return next;
    });
  };

  const toggleWeekCollapse = (key: string) =>
    setWeekCollapsed((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const handleTriggerPlan = (role: TargetRole, regenerate = false) => {
    if (!data) return;
    generateWeeklyPlan({
      data: {
        username,
        score: data.scoreBreakdown.total,
        breakdown: data.scoreBreakdown as unknown as Record<string, number>,
        weaknesses: data.aiInsights.weaknesses,
        strengths: data.aiInsights.strengths,
        targetRole: role,
        languages: Object.keys(data.languageDistribution),
        topRepos: [data.repoStats.mostStarredRepo].filter(Boolean) as string[],
        regenerate,
      },
    });
  };

  // Auto-generate weekly plan once analysis data is ready
  useEffect(() => {
    if (data && !weeklyPlan && !weekPlanPending) {
      handleTriggerPlan(targetRole, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Notify greeter character with score
  const scoreSentRef = useRef(false);
  useEffect(() => {
    if (data && !scoreSentRef.current) {
      scoreSentRef.current = true;
      greeterBus.emit({ type: "score", score: data.scoreBreakdown.total });
    }
  }, [data]);

  // Error empathy
  const errorSentRef = useRef(false);
  useEffect(() => {
    if (error && !errorSentRef.current) {
      errorSentRef.current = true;
      greeterBus.emit({ type: "error", msg: "Hmm, couldn't find them! 🤔" });
    }
  }, [error]);

  // GSAP stagger cards when weeklyPlan data arrives
  useEffect(() => {
    if (!weeklyPlan || !weekPlanRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        weekPlanRef.current!.querySelectorAll(".week-card"),
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.4,
          stagger: 0.1,
          ease: "power2.out",
          clearProps: "opacity",
        }
      );
    }, weekPlanRef);
    return () => ctx.revert();
  }, [weeklyPlan]);

  const langData = useMemo(() => {
    if (!data) return [] as { name: string; value: number }[];
    return Object.entries(data.languageDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, pct]) => ({ name, value: pct }));
  }, [data]);

  const handleShareReport = async () => {
    const reportUrl = `${window.location.origin}${import.meta.env.BASE_URL}report/${username}`
      .replace(/\/\//g, "/")
      .replace(":/", "://");
    try {
      await navigator.clipboard.writeText(reportUrl);
      toast({ title: "Report link copied!", description: `Share /report/${username} with anyone.` });
      greeterBus.emit({ type: "celebrate", msg: "Link copied! 📎" });
    } catch {
      toast({ title: "Copy failed", description: "Please copy the URL manually.", variant: "destructive" });
    }
  };

  const handleCopyBadge = async () => {
    const badgeUrl = apiUrl(`/api/badge/${username}.svg`);
    const reportUrl = `${window.location.origin}/report/${username}`;
    const mdSnippet = `[![DevScope AI Rating](${badgeUrl})](${reportUrl})`;
    try {
      await navigator.clipboard.writeText(mdSnippet);
      setBadgeCopied(true);
      toast({ title: "Markdown Copied! 🛡️", description: "Paste directly into your GitHub profile README.md" });
      setTimeout(() => setBadgeCopied(false), 2500);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const handleFetchInterviewPrep = async () => {
    if (!data || interviewLoading) return;
    setInterviewLoading(true);
    try {
      const res = await fetch(apiUrl("/api/ai/interview-prep"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          username,
          topRepos: [data.repoStats.mostStarredRepo].filter(Boolean),
          languages: Object.keys(data.languageDistribution),
          score: data.scoreBreakdown.total,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setInterviewQuestions(json.questions || []);
        toast({ title: "Questions Generated! 🎙️", description: "4 realistic screen questions tailored to your repos." });
      }
    } catch {
      toast({ title: "Could not generate questions", variant: "destructive" });
    } finally {
      setInterviewLoading(false);
    }
  };

  const handleFetchResumeBullets = async () => {
    if (!data || resumeLoading) return;
    setResumeLoading(true);
    try {
      const res = await fetch(apiUrl("/api/ai/resume-bullets"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          username,
          topRepos: [data.repoStats.mostStarredRepo].filter(Boolean),
          languages: Object.keys(data.languageDistribution),
          totalStars: data.repoStats.totalStars,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setResumeBullets(json.bullets || []);
        toast({ title: "Bullets Generated! 📄", description: "Quantified X-Y-Z bullet points ready for your resume." });
      }
    } catch {
      toast({ title: "Could not generate resume bullets", variant: "destructive" });
    } finally {
      setResumeLoading(false);
    }
  };

  const handleCopyBullet = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedBulletIdx(idx);
      toast({ title: "Bullet copied to clipboard!" });
      setTimeout(() => setCopiedBulletIdx(null), 2500);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  if (!username) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="border-4 border-black bg-white p-10 shadow-[6px_6px_0_#000] text-center max-w-sm">
            <h2 className="font-heading font-black text-2xl uppercase mb-3">No username provided</h2>
            <button
              onClick={() => setLocation("/")}
              className="border-2 border-black bg-primary px-6 py-2.5 font-bold uppercase shadow-[3px_3px_0_#000] hover:-translate-y-0.5 transition-all text-sm"
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

  if (error || !data) {
    const errMsg = (error as Error)?.message ?? "User not found";
    const isNotFound = errMsg.toLowerCase().includes("not found");
    const isRateLimit = errMsg.toLowerCase().includes("rate limit");

    return (
      <PageTransition>
        <div className="flex items-center justify-center min-h-[60vh] px-4">
          <div
            className={`border-4 border-black p-8 max-w-md w-full shadow-[8px_8px_0_#000] text-center ${
              isNotFound ? "bg-yellow-300" : isRateLimit ? "bg-orange-300" : "bg-red-400"
            }`}
          >
            <div className="text-4xl mb-3">{isNotFound ? "🔍" : isRateLimit ? "⏱️" : "⚠️"}</div>
            <h2 className="font-heading font-black text-2xl uppercase mb-2">
              {isNotFound ? "User Not Found" : isRateLimit ? "Rate Limited" : "Something Went Wrong"}
            </h2>
            <p className="font-medium text-sm mb-6 text-black/80">
              {isNotFound
                ? `@${username} doesn't exist on GitHub or their profile is private.`
                : isRateLimit
                ? "GitHub API rate limit reached. Please wait a few minutes and try again."
                : errMsg}
            </p>
            <div className="flex gap-3 justify-center">
              {!isNotFound && (
                <button
                  onClick={() => window.location.reload()}
                  className="border-2 border-black bg-white px-5 py-2 font-bold uppercase text-xs shadow-[3px_3px_0_#000] hover:-translate-y-0.5 transition-all"
                >
                  Retry
                </button>
              )}
              <button
                onClick={() => setLocation("/")}
                className="border-2 border-black bg-white px-5 py-2 font-bold uppercase text-xs shadow-[3px_3px_0_#000] hover:-translate-y-0.5 transition-all"
              >
                Try Another
              </button>
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  const { profile, repoStats, scoreBreakdown, aiInsights, analyzedAt, cached } = data;
  const scoreColor = ScoreColor(scoreBreakdown.total);
  const tierInfo = getGradeTier(scoreBreakdown.total);

  return (
    <PageTransition>
      <div ref={pageRef} className="space-y-8 pb-16 max-w-7xl mx-auto px-2 sm:px-4">
        {/* Top actions sub-header */}
        <div className="border-4 border-black bg-white px-5 py-3 shadow-[4px_4px_0_#000] flex items-center justify-between">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 font-heading font-black uppercase text-xs hover:text-primary transition-colors tracking-wider"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Search
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={handleShareReport}
              className="flex items-center gap-1.5 border-2 border-black bg-white px-3 py-1 font-black uppercase text-xs shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] hover:-translate-y-0.5 transition-all"
            >
              <Link2 className="w-3.5 h-3.5" />
              Share Report
            </button>
            {cached && (
              <span className="hidden sm:inline-block text-[11px] font-bold uppercase tracking-wider bg-gray-100 border border-black px-2 py-0.5">
                Cached (Fast)
              </span>
            )}
            <HiringBadge rec={aiInsights.hiringRecommendation} />
          </div>
        </div>

        {/* ── ROW 1: Balanced Profile Overview (Developer, Score Gauge, Languages) ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          {/* Col 1: Developer Info Card (5 cols) */}
          <div
            className="md:col-span-5 border-4 border-black bg-white p-6 shadow-[6px_6px_0_#000] flex flex-col justify-between"
            onMouseEnter={cardHover.onMouseEnter}
            onMouseLeave={cardHover.onMouseLeave}
          >
            <div>
              <div className="flex items-start gap-4">
                <img
                  src={profile.avatar_url}
                  alt={profile.login}
                  className="w-16 h-16 border-3 border-black object-cover shadow-[3px_3px_0_#000] flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h1 className="font-heading font-black text-xl sm:text-2xl uppercase leading-tight truncate">
                    {profile.name ?? profile.login}
                  </h1>
                  <p className="text-primary font-bold text-sm">@{profile.login}</p>
                  <a
                    href={`https://github.com/${profile.login}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-black mt-1"
                  >
                    View on GitHub <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t-2 border-black">
                {profile.bio && (
                  <p className="font-medium text-xs text-muted-foreground line-clamp-2 italic mb-2">
                    "{profile.bio}"
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <span className="inline-block border border-black bg-yellow-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-[1.5px_1.5px_0_#000]">
                    {scoreBreakdown.total >= 85
                      ? "⚡ 10x Systems Architect"
                      : scoreBreakdown.total >= 70
                      ? "🚢 Battle-Hardened Shipper"
                      : scoreBreakdown.total >= 50
                      ? "🔨 Pragmatic Code Crafter"
                      : "🌱 Emerging Explorer"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t-2 border-black grid grid-cols-2 gap-2 text-xs font-bold text-muted-foreground">
              <div className="flex items-center gap-1.5 truncate">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-black" />
                <span className="truncate">{profile.location || "Earth"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 flex-shrink-0 text-black" />
                <span>{profile.followers} followers</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 flex-shrink-0 text-black" />
                <span>Since {new Date(profile.created_at).getFullYear()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Book className="w-3.5 h-3.5 flex-shrink-0 text-black" />
                <span>{profile.public_repos} repos</span>
              </div>
            </div>
          </div>

          {/* Col 2: Score Card (3 cols) */}
          <div
            className="md:col-span-3 border-4 border-black bg-white p-6 shadow-[6px_6px_0_#000] flex flex-col items-center justify-center text-center"
            onMouseEnter={cardHover.onMouseEnter}
            onMouseLeave={cardHover.onMouseLeave}
          >
            <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-1">
              DevScope Score
            </p>
            <div className="font-heading font-black text-6xl tracking-tighter my-1">
              <AnimatedScore target={scoreBreakdown.total} color={scoreColor} />
              <span className="text-2xl text-muted-foreground font-normal">/100</span>
            </div>
            <div className="mt-2">
              <span className={`inline-block px-3 py-0.5 border-2 border-black text-xs font-black uppercase tracking-wider ${tierInfo.bg}`}>
                {tierInfo.grade} · {aiInsights.hiringRecommendation.replace(/_/g, " ")}
              </span>
            </div>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Deterministic Recruiter Rating
            </p>
          </div>

          {/* Col 3: Languages Donut Card (4 cols) */}
          <div
            className="md:col-span-4 border-4 border-black bg-white p-6 shadow-[6px_6px_0_#000] flex flex-col justify-between"
            onMouseEnter={cardHover.onMouseEnter}
            onMouseLeave={cardHover.onMouseLeave}
          >
            <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-2">
              <h3 className="font-heading font-black uppercase text-sm">Tech Diversity</h3>
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Top Languages</span>
            </div>

            {langData.length > 0 ? (
              <div className="h-32 w-full my-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={langData} cx="50%" cy="50%" innerRadius={34} outerRadius={55} dataKey="value" stroke="#000" strokeWidth={2}>
                      {langData.map((_, i) => (
                        <Cell key={i} fill={LANG_COLORS[i % LANG_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: number) => [`${val}%`, "Share"]}
                      contentStyle={{ border: "2px solid #000", fontWeight: "bold", fontSize: "12px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-muted-foreground text-xs font-medium my-auto text-center">No language data detected</p>
            )}

            <div className="flex flex-wrap gap-1.5 mt-2">
              {langData.slice(0, 4).map((l, i) => (
                <span
                  key={l.name}
                  className="inline-flex items-center gap-1 text-[11px] font-bold border border-black px-2 py-0.5 bg-gray-50"
                >
                  <span className="w-2 h-2 rounded-full border border-black" style={{ backgroundColor: LANG_COLORS[i % LANG_COLORS.length] }} />
                  {l.name} ({l.value}%)
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── ROW 2: Category Breakdown & Quick Metric Tiles ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left: 5-Category Breakdown (7 cols) */}
          <div ref={breakdownRef} className="lg:col-span-7 border-4 border-black bg-white p-6 shadow-[6px_6px_0_#000]">
            <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
              <h2 className="font-heading font-black uppercase text-lg">Category Breakdown</h2>
              <span className="text-xs font-bold text-muted-foreground uppercase">100 Pts Total</span>
            </div>
            <div className="space-y-4">
              {[
                { label: "Repo Quality", val: scoreBreakdown.repoQuality, max: 30, color: "bg-primary" },
                { label: "Activity Consistency", val: scoreBreakdown.activityConsistency, max: 25, color: "bg-green-400" },
                { label: "Tech Diversity", val: scoreBreakdown.techDiversity, max: 20, color: "bg-blue-400" },
                { label: "Popularity & Reach", val: scoreBreakdown.popularity, max: 15, color: "bg-purple-400" },
                { label: "Profile Completeness", val: scoreBreakdown.completeness, max: 10, color: "bg-yellow-300" },
              ].map(({ label, val, max, color }) => (
                <div key={label}>
                  <div className="flex justify-between font-bold text-xs mb-1 uppercase tracking-wide">
                    <span>{label}</span>
                    <span>{val} / {max}</span>
                  </div>
                  <div className="w-full h-4 bg-gray-100 border-2 border-black overflow-hidden shadow-[1px_1px_0_#000]">
                    <div
                      className={`h-full ${color} border-r-2 border-black gsap-bar will-change-[width]`}
                      data-width={`${(val / max) * 100}%`}
                      style={{ width: "0%" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Quick Stats 2x2 Grid (5 cols) */}
          <div ref={statsRef} className="lg:col-span-5 grid grid-cols-2 gap-4">
            {[
              { label: "Public Repos", val: repoStats.totalRepos, icon: <Book className="w-4 h-4 text-primary" />, desc: "Owned repositories" },
              { label: "Total Stars", val: repoStats.totalStars, icon: <Star className="w-4 h-4 text-yellow-500" />, desc: "Across all projects" },
              { label: "Total Forks", val: repoStats.totalForks, icon: <GitFork className="w-4 h-4 text-blue-500" />, desc: "Community engagement" },
              { label: "Avg Stars / Repo", val: repoStats.avgStarsPerRepo, icon: <TrendingUp className="w-4 h-4 text-green-600" />, desc: "Quality per project" },
            ].map(({ label, val, icon, desc }) => (
              <div
                key={label}
                className="stat-card border-4 border-black bg-white p-4 shadow-[4px_4px_0_#000] flex flex-col justify-between"
                onMouseEnter={cardHover.onMouseEnter}
                onMouseLeave={cardHover.onMouseLeave}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {icon}
                  <p className="font-bold text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
                </div>
                <p className="font-heading font-black text-3xl my-1">{val.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground font-semibold">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── ROW 3: AI Recruiter Insights Panel ── */}
        <div ref={insightsRef} className="reveal border-4 border-black bg-white p-6 shadow-[6px_6px_0_#000]">
          <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">Autonomous Neural Engine</span>
              <h2 className="font-heading font-black uppercase text-xl mt-0.5">Recruiter Assessment & Verdict</h2>
            </div>
            <HiringBadge rec={aiInsights.hiringRecommendation} />
          </div>

          <div className="border-2 border-black p-4 mb-5 bg-gray-50 shadow-[2px_2px_0_#000]">
            <p className="font-medium text-xs leading-relaxed italic text-black/90">
              "{aiInsights.summary}"
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="insight-card border-2 border-black p-4 shadow-[3px_3px_0_#000] bg-green-50">
              <h3 className="font-heading font-black uppercase text-xs mb-3 border-b-2 border-black pb-1 text-green-800">
                Key Strengths
              </h3>
              <ul className="space-y-2">
                {aiInsights.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs font-semibold">
                    <span className="text-green-600 font-black">✓</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="insight-card border-2 border-black p-4 shadow-[3px_3px_0_#000] bg-red-50">
              <h3 className="font-heading font-black uppercase text-xs mb-3 border-b-2 border-black pb-1 text-red-800">
                Key Weaknesses
              </h3>
              <ul className="space-y-2">
                {aiInsights.weaknesses.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs font-semibold">
                    <span className="text-red-500 font-black">✕</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="insight-card border-2 border-black p-4 shadow-[3px_3px_0_#000] bg-orange-50">
              <h3 className="font-heading font-black uppercase text-xs mb-3 border-b-2 border-black pb-1 text-orange-800">
                Action Suggestions
              </h3>
              <ul className="space-y-2">
                {aiInsights.suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs font-semibold">
                    <span className="text-orange-500 font-black">→</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* ── ROW 4: AI 30-Day Growth Roadmap with Target Role Selector ── */}
        <div className="reveal border-4 border-black bg-white shadow-[6px_6px_0_#000]">
          {/* Header */}
          <div className="px-6 py-5 border-b-2 border-black flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary border-b-2 border-primary pb-0.5">Autonomous Engine</span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-green-100 border border-black">Dynamic Generator</span>
              </div>
              <h2 className="font-heading font-black uppercase text-xl mt-1">📅 30-Day Career & Action Roadmap</h2>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                Pick a target career role below to dynamically generate a customized improvement plan.
              </p>
            </div>
            <button
              onClick={() => {
                resetWeeklyPlan();
                handleTriggerPlan(targetRole, true);
              }}
              disabled={weekPlanPending}
              className="flex-shrink-0 flex items-center gap-2 border-2 border-black bg-white px-4 py-2 font-black uppercase text-xs shadow-[3px_3px_0_#000] hover:shadow-[5px_5px_0_#000] hover:-translate-y-0.5 transition-all disabled:opacity-40"
            >
              {weekPlanPending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-black border-t-primary rounded-full animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  Regenerate Fresh
                </>
              )}
            </button>
          </div>

          {/* Role Selector Bar */}
          <div className="px-6 py-3 bg-gray-50 border-b-2 border-black flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground mr-1 flex items-center gap-1 flex-shrink-0">
              <Layers className="w-3.5 h-3.5" /> Target:
            </span>
            {ROLE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  if (targetRole === opt.id) return;
                  setTargetRole(opt.id);
                  resetWeeklyPlan();
                  handleTriggerPlan(opt.id, false);
                }}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 border-2 border-black text-xs font-black uppercase transition-all shadow-[2px_2px_0_#000] ${
                  targetRole === opt.id
                    ? "bg-primary text-black -translate-y-0.5 shadow-[3px_3px_0_#000]"
                    : "bg-white hover:bg-gray-100"
                }`}
              >
                <span>{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>

          {/* Week Cards */}
          <div className="p-6">
            {weekPlanPending ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-5 h-5 border-2 border-black border-t-primary rounded-full animate-spin flex-shrink-0" />
                  <p className="font-bold text-xs uppercase tracking-wide text-muted-foreground">
                    DevScope AI is crafting your {ROLE_OPTIONS.find((r) => r.id === targetRole)?.label} roadmap…
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-28 border-2 border-black bg-gray-50 animate-pulse shadow-[2px_2px_0_#000]" />
                  ))}
                </div>
              </div>
            ) : weeklyPlan ? (
              <div ref={weekPlanRef} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {(
                  [
                    { key: "week1", label: "Week 1: Immediate Wins", emoji: "🔥", accentBorder: "border-l-red-400", headerBg: "bg-red-50", badgeBg: "bg-red-400" },
                    { key: "week2", label: "Week 2: Architectural Depth", emoji: "🚀", accentBorder: "border-l-primary", headerBg: "bg-orange-50", badgeBg: "bg-primary" },
                    { key: "week3", label: "Week 3: Domain Specialization", emoji: "✅", accentBorder: "border-l-blue-400", headerBg: "bg-blue-50", badgeBg: "bg-blue-400" },
                    { key: "week4", label: "Week 4: Industry Visibility", emoji: "⭐", accentBorder: "border-l-purple-400", headerBg: "bg-purple-50", badgeBg: "bg-purple-400" },
                  ] as const
                ).map(({ key, label, emoji, accentBorder, headerBg, badgeBg }, weekIdx) => {
                  const tasks: string[] = (weeklyPlan[key] as string[]) ?? [];
                  const isCurrentWeek = weekIdx === 0;
                  const isCollapsed = weekCollapsed.has(key);
                  const doneCount = tasks.filter((_, ti) => weekChecked.has(`${key}-${ti}`)).length;
                  const allDone = doneCount === tasks.length && tasks.length > 0;

                  return (
                    <div
                      key={key}
                      className={`week-card border-3 border-black shadow-[3px_3px_0_#000] border-l-8 ${accentBorder} overflow-hidden bg-white flex flex-col justify-between`}
                    >
                      <div>
                        <button
                          onClick={() => toggleWeekCollapse(key)}
                          className={`w-full flex items-center justify-between px-4 py-3 ${isCurrentWeek ? "bg-black text-white" : headerBg} hover:brightness-95 transition-all text-left`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={`w-8 h-8 border-2 ${isCurrentWeek ? "border-white bg-white text-black" : "border-black " + badgeBg} flex items-center justify-center text-sm font-black flex-shrink-0`}>
                              {allDone ? "✓" : emoji}
                            </span>
                            <div>
                              <p className={`font-heading font-black uppercase text-sm leading-tight ${isCurrentWeek ? "text-white" : "text-black"}`}>
                                {label}
                              </p>
                              <p className={`text-[11px] font-semibold ${isCurrentWeek ? "text-white/70" : "text-muted-foreground"}`}>
                                {doneCount}/{tasks.length} completed
                              </p>
                            </div>
                          </div>
                          <span className={`text-xs font-black transition-transform duration-200 ${isCurrentWeek ? "text-white" : ""} ${isCollapsed ? "rotate-0" : "rotate-180"}`}>
                            ▼
                          </span>
                        </button>

                        {!isCollapsed && (
                          <ul className="divide-y-2 divide-black">
                            {tasks.map((task, ti) => {
                              const ck = `${key}-${ti}`;
                              const isDone = weekChecked.has(ck);
                              return (
                                <li
                                  key={ti}
                                  className={`flex items-start gap-3 px-4 py-3 transition-colors ${isDone ? "bg-green-50" : "bg-white hover:bg-gray-50"}`}
                                >
                                  <button
                                    onClick={() => toggleWeekCheck(ck)}
                                    aria-label={isDone ? "Mark incomplete" : "Mark complete"}
                                    className={`mt-0.5 w-5 h-5 border-2 border-black flex-shrink-0 flex items-center justify-center transition-all shadow-[1px_1px_0_#000] hover:-translate-y-0.5 ${
                                      isDone ? "bg-green-400" : "bg-white"
                                    }`}
                                  >
                                    {isDone && <span className="text-[10px] font-black">✓</span>}
                                  </button>
                                  <span className={`flex-1 font-semibold text-xs leading-relaxed ${isDone ? "line-through text-muted-foreground" : ""}`}>
                                    {task}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>

                      <div className="w-full h-1.5 bg-gray-100 border-t-2 border-black">
                        <div
                          className="h-full bg-green-400 transition-all duration-300"
                          style={{ width: tasks.length > 0 ? `${(doneCount / tasks.length) * 100}%` : "0%" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-6 text-xs font-medium">Could not load roadmap. Click Regenerate to retry.</p>
            )}

            {/* Overall progress meter */}
            {weeklyPlan && (() => {
              const allKeys: (keyof WeeklyRoadmap & `week${number}`)[] = ["week1", "week2", "week3", "week4"];
              const allTasks = allKeys.flatMap((k) => (weeklyPlan[k] as string[]) ?? []);
              const totalCount = allTasks.length;
              const doneCount = allKeys.flatMap((k, wi) =>
                ((weeklyPlan[k] as string[]) ?? []).map((_, ti) => `week${wi + 1}-${ti}`)
              ).filter((ck) => weekChecked.has(ck)).length;
              const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

              return (
                <div className="mt-5 border-2 border-black p-3.5 bg-background shadow-[2px_2px_0_#000]">
                  <div className="flex justify-between font-bold text-xs mb-1.5 uppercase tracking-wide">
                    <span>30-Day Completion (Progress Saved)</span>
                    <span className="text-primary font-black">{doneCount}/{totalCount} tasks — {pct}%</span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 border-2 border-black overflow-hidden">
                    <div
                      className="h-full bg-primary border-r-2 border-black transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* ── ROW 5: Developer Career & Sharing Toolkit (Tabbed Interface) ── */}
        <div className="reveal border-4 border-black bg-white shadow-[6px_6px_0_#000] overflow-hidden">
          {/* Toolkit Header with Tabs */}
          <div className="px-6 py-4 border-b-2 border-black bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">SaaS Toolkit</span>
              <h2 className="font-heading font-black uppercase text-xl">Developer & Career Suite</h2>
            </div>
            {/* Tabs */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setActiveToolkitTab("badge")}
                className={`flex items-center gap-1.5 px-3 py-1.5 border-2 border-black text-xs font-black uppercase transition-all shadow-[2px_2px_0_#000] ${
                  activeToolkitTab === "badge" ? "bg-primary text-black" : "bg-white hover:bg-gray-100"
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                README Badge
              </button>
              <button
                onClick={() => setActiveToolkitTab("interview")}
                className={`flex items-center gap-1.5 px-3 py-1.5 border-2 border-black text-xs font-black uppercase transition-all shadow-[2px_2px_0_#000] ${
                  activeToolkitTab === "interview" ? "bg-primary text-black" : "bg-white hover:bg-gray-100"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Interview Simulator
              </button>
              <button
                onClick={() => setActiveToolkitTab("resume")}
                className={`flex items-center gap-1.5 px-3 py-1.5 border-2 border-black text-xs font-black uppercase transition-all shadow-[2px_2px_0_#000] ${
                  activeToolkitTab === "resume" ? "bg-primary text-black" : "bg-white hover:bg-gray-100"
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                Resume Bullets
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Tab 1: Embed Badge */}
            {activeToolkitTab === "badge" && (
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-heading font-black text-base uppercase">Embed Live DevScope Badge</h3>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">
                      Paste this dynamic SVG badge directly into your GitHub profile README to showcase your rating.
                    </p>
                  </div>
                  <button
                    onClick={handleCopyBadge}
                    className="flex items-center gap-2 border-2 border-black bg-primary px-4 py-2 font-black uppercase text-xs shadow-[3px_3px_0_#000] hover:shadow-[5px_5px_0_#000] hover:-translate-y-0.5 transition-all"
                  >
                    {badgeCopied ? <Check className="w-3.5 h-3.5 text-black" /> : <Copy className="w-3.5 h-3.5" />}
                    {badgeCopied ? "Markdown Copied!" : "Copy README Badge Markdown"}
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-5 bg-zinc-900 border-2 border-black p-4 text-white">
                  <div className="flex-shrink-0">
                    <img
                      src={apiUrl(`/api/badge/${username}.svg`)}
                      alt="DevScope Score Badge"
                      className="max-w-full h-auto drop-shadow-md"
                    />
                  </div>
                  <div className="flex-1 font-mono text-[11px] text-zinc-300 break-all bg-black/60 p-3 border border-zinc-700">
                    <code>{`[![DevScope Rating](${apiUrl(`/api/badge/${username}.svg`)})](${window.location.origin}/report/${username})`}</code>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Interview Simulator */}
            {activeToolkitTab === "interview" && (
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b-2 border-black pb-3">
                  <div>
                    <h3 className="font-heading font-black text-base uppercase">Technical Interview Screen Simulator</h3>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">
                      DevScope AI reviews your specific repositories and predicts the architectural questions interviewers will ask.
                    </p>
                  </div>
                  <button
                    onClick={handleFetchInterviewPrep}
                    disabled={interviewLoading}
                    className="flex items-center gap-1.5 border-2 border-black bg-primary px-4 py-2 font-black uppercase text-xs shadow-[3px_3px_0_#000] hover:-translate-y-0.5 transition-all disabled:opacity-40"
                  >
                    {interviewLoading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-black border-t-white rounded-full animate-spin" />
                        Generating…
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        {interviewQuestions.length > 0 ? "Regenerate" : "Generate Questions"}
                      </>
                    )}
                  </button>
                </div>

                {interviewQuestions.length === 0 && !interviewLoading && (
                  <div className="text-center py-8 border-2 border-dashed border-black bg-gray-50">
                    <p className="font-heading font-bold uppercase text-sm mb-1">Simulate Interview Questions</p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-3">
                      Click the button above to generate 4 customized technical questions based on your public code.
                    </p>
                    <button
                      onClick={handleFetchInterviewPrep}
                      className="border-2 border-black bg-primary px-4 py-1.5 font-bold uppercase text-xs shadow-[2px_2px_0_#000]"
                    >
                      Start Simulator
                    </button>
                  </div>
                )}

                {interviewQuestions.length > 0 && (
                  <div className="space-y-3">
                    {interviewQuestions.map((q, idx) => {
                      const isExpanded = interviewExpanded === idx;
                      return (
                        <div key={idx} className="border-2 border-black shadow-[2px_2px_0_#000] overflow-hidden bg-white">
                          <button
                            onClick={() => setInterviewExpanded(isExpanded ? null : idx)}
                            className="w-full text-left p-3.5 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-start gap-2.5">
                              <span className="font-heading font-black text-primary text-sm">Q{idx + 1}.</span>
                              <div>
                                <p className="font-bold text-xs leading-snug">{q.question}</p>
                                <span className="inline-block mt-0.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                  {q.contextRepo} · {q.difficulty}
                                </span>
                              </div>
                            </div>
                            <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                          </button>

                          {isExpanded && (
                            <div className="p-3.5 bg-gray-50 border-t-2 border-black space-y-2 text-xs font-medium">
                              <div className="border-l-3 border-primary pl-2.5 py-0.5 bg-white">
                                <p className="font-bold uppercase tracking-wider text-muted-foreground text-[10px]">What Interviewers Test For:</p>
                                <p className="text-black/80">{q.signalsLookedFor}</p>
                              </div>
                              <div className="border-l-3 border-green-500 pl-2.5 py-0.5 bg-white">
                                <p className="font-bold uppercase tracking-wider text-green-700 text-[10px]">Key Talking Points & Strategy:</p>
                                <p className="text-black/80">{q.sampleAnswerTips}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Resume Bullets */}
            {activeToolkitTab === "resume" && (
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b-2 border-black pb-3">
                  <div>
                    <h3 className="font-heading font-black text-base uppercase">Resume & LinkedIn Bullet Point Generator</h3>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">
                      Converts top repositories into quantified bullets following Google's "X-Y-Z" format.
                    </p>
                  </div>
                  <button
                    onClick={handleFetchResumeBullets}
                    disabled={resumeLoading}
                    className="flex items-center gap-1.5 border-2 border-black bg-primary px-4 py-2 font-black uppercase text-xs shadow-[3px_3px_0_#000] hover:-translate-y-0.5 transition-all disabled:opacity-40"
                  >
                    {resumeLoading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-black border-t-white rounded-full animate-spin" />
                        Generating…
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        {resumeBullets.length > 0 ? "Regenerate" : "Extract Bullets"}
                      </>
                    )}
                  </button>
                </div>

                {resumeBullets.length === 0 && !resumeLoading && (
                  <div className="text-center py-8 border-2 border-dashed border-black bg-gray-50">
                    <p className="font-heading font-bold uppercase text-sm mb-1">Generate Resume Bullets</p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-3">
                      Transform your GitHub repositories into bullet points ready to paste into your CV or LinkedIn profile.
                    </p>
                    <button
                      onClick={handleFetchResumeBullets}
                      className="border-2 border-black bg-primary px-4 py-1.5 font-bold uppercase text-xs shadow-[2px_2px_0_#000]"
                    >
                      Extract Bullets
                    </button>
                  </div>
                )}

                {resumeBullets.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {resumeBullets.map((b, idx) => (
                      <div key={idx} className="border-2 border-black p-3.5 bg-white shadow-[2px_2px_0_#000] flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider bg-gray-100 border border-black px-1.5 py-0.5">
                              {b.repoName}
                            </span>
                            <span className="text-[11px] font-bold text-primary">{b.quantifiedImpact}</span>
                          </div>
                          <p className="text-xs font-semibold leading-relaxed text-black/90 mb-2">
                            • {b.bullet}
                          </p>
                        </div>
                        <div className="flex items-center justify-between border-t border-gray-200 pt-2">
                          <div className="flex gap-1 flex-wrap">
                            {b.techStack?.map((t: string) => (
                              <span key={t} className="text-[9px] font-bold bg-gray-50 border border-gray-300 px-1 py-0.5">
                                {t}
                              </span>
                            ))}
                          </div>
                          <button
                            onClick={() => handleCopyBullet(b.bullet, idx)}
                            className="flex items-center gap-1 text-[11px] font-black uppercase border border-black px-2 py-0.5 bg-white hover:bg-gray-100 shadow-[1px_1px_0_#000]"
                          >
                            {copiedBulletIdx === idx ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                            {copiedBulletIdx === idx ? "Copied" : "Copy"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── ROW 6: Share Report Bar ── */}
        <div className="reveal border-4 border-black bg-black text-white p-6 shadow-[6px_6px_0_0_#FF8D3F] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-heading font-black text-lg uppercase">Share this verification report</p>
            <p className="text-xs text-white/70 font-medium mt-0.5">
              Anyone with the link can view a public read-only snapshot — no login required.
            </p>
          </div>
          <div className="flex gap-2.5 flex-shrink-0 flex-wrap">
            <button
              onClick={handleShareReport}
              className="flex items-center gap-1.5 border-2 border-white bg-transparent text-white px-3.5 py-2 font-bold text-xs uppercase hover:bg-white hover:text-black transition-all"
            >
              <Link2 className="w-3.5 h-3.5" />
              Copy Link
            </button>
            <button
              onClick={() => setLocation(`/report/${username}`)}
              className="flex items-center gap-1.5 border-2 border-primary bg-primary text-black px-4 py-2 font-bold text-xs uppercase shadow-[2px_2px_0_#FF8D3F] hover:-translate-y-0.5 transition-all"
            >
              View Public Report
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground text-center font-medium pb-2">
          Profile analyzed at {new Date(analyzedAt).toLocaleString()}
        </p>
      </div>
    </PageTransition>
  );
}
