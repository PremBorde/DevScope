import { useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
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

export type TargetRole = "fullstack" | "backend" | "ai_ml" | "frontend" | "devops" | "open_source";

const ROLE_OPTIONS: { id: TargetRole; label: string; icon: string }[] = [
  { id: "fullstack", label: "Full-Stack", icon: "🌐" },
  { id: "backend", label: "Backend & Systems", icon: "⚡" },
  { id: "ai_ml", label: "AI & Machine Learning", icon: "🤖" },
  { id: "frontend", label: "Frontend & UI", icon: "🎨" },
  { id: "devops", label: "Cloud & DevOps", icon: "☁️" },
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
  const [interviewExpanded, setInterviewExpanded] = useState<number | null>(null);

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
  useStaggerEntrance(statsRef, ".stat-card", { stagger: 0.1, delay: 0.1 });
  useScrollReveal(pageRef, ".reveal");
  useStaggerEntrance(insightsRef, ".insight-card", { stagger: 0.12, delay: 0.05 });

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

    // Also sync from backend
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

      // Sync to backend
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

  // Call roadmap generation with target role
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

  const langData = useMemo(() => {
    if (!data) return [] as { name: string; value: number }[];
    return Object.entries(data.languageDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, pct]) => ({ name, value: pct }));
  }, [data]);

  const handleShareReport = async () => {
    const reportUrl = `${window.location.origin}${import.meta.env.BASE_URL}report/${username}`
      .replace(/\/\//g, "/")
      .replace(":/", "://");
    try {
      await navigator.clipboard.writeText(reportUrl);
      toast({ title: "Report link copied!", description: `Share /report/${username} with anyone — no login required.` });
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
      toast({ title: "Badge Markdown Copied! 🛡️", description: "Paste this into your GitHub profile README.md" });
      setTimeout(() => setBadgeCopied(false), 3000);
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
        toast({ title: "Recruiter Questions Ready! 🎙️", description: "AI generated 4 technical questions based on your repos." });
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
        toast({ title: "Resume Bullets Ready! 📄", description: "Quantified X-Y-Z bullets generated for your resume." });
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
                  className="border-2 border-black bg-white px-5 py-2.5 font-bold uppercase text-sm shadow-[3px_3px_0_#000] hover:-translate-y-0.5 transition-all"
                >
                  Retry
                </button>
              )}
              <button
                onClick={() => setLocation("/")}
                className="border-2 border-black bg-white px-5 py-2.5 font-bold uppercase text-sm shadow-[3px_3px_0_#000] hover:-translate-y-0.5 transition-all"
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

  return (
    <PageTransition>
      <div ref={pageRef} className="space-y-10 pb-16">
        {/* Sticky top sub-header */}
        <div className="border-4 border-black bg-white p-4 shadow-[4px_4px_0_#000] flex items-center justify-between sticky top-20 z-40">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 font-heading font-bold uppercase text-sm hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={handleShareReport}
              className="hidden sm:flex items-center gap-1.5 border-2 border-black bg-white px-3 py-1 font-bold uppercase text-xs shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] hover:-translate-y-0.5 transition-all"
            >
              <Link2 className="w-3.5 h-3.5" />
              Share
            </button>
            {cached && (
              <span className="text-xs font-bold uppercase tracking-wider bg-gray-100 border border-black px-2 py-0.5">
                Cached
              </span>
            )}
            <HiringBadge rec={aiInsights.hiringRecommendation} />
          </div>
        </div>

        {/* Profile Card & Score */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Developer Card */}
          <div
            className="border-4 border-black bg-white p-6 shadow-[8px_8px_0_#000] flex flex-col justify-between will-change-transform"
            style={{ transform: "rotate(-0.5deg)" }}
            onMouseEnter={cardHover.onMouseEnter}
            onMouseLeave={cardHover.onMouseLeave}
          >
            <div className="flex items-start gap-4">
              <img
                src={profile.avatar_url}
                alt={profile.login}
                className="w-20 h-20 border-4 border-black object-cover shadow-[4px_4px_0_#000]"
              />
              <div>
                <h1 className="font-heading font-black text-2xl uppercase leading-tight">
                  {profile.name ?? profile.login}
                </h1>
                <p className="text-primary font-bold text-sm">@{profile.login}</p>
                <a
                  href={`https://github.com/${profile.login}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-black mt-1"
                >
                  GitHub Profile <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {profile.bio && (
              <p className="mt-4 font-medium text-sm border-t-2 border-black pt-3 text-muted-foreground">
                "{profile.bio}"
              </p>
            )}

            <div className="mt-4 pt-4 border-t-2 border-black grid grid-cols-2 gap-2 text-xs font-bold text-muted-foreground">
              {profile.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {profile.location}
                </div>
              )}
              <div className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> {profile.followers} followers
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Since {new Date(profile.created_at).getFullYear()}
              </div>
              <div className="flex items-center gap-1">
                <Book className="w-3.5 h-3.5" /> {profile.public_repos} repos
              </div>
            </div>
          </div>

          {/* Score Counter Card */}
          <div
            className="border-4 border-black bg-white p-6 shadow-[8px_8px_0_#000] flex flex-col items-center justify-center text-center will-change-transform"
            style={{ transform: "rotate(0.5deg)" }}
            onMouseEnter={cardHover.onMouseEnter}
            onMouseLeave={cardHover.onMouseLeave}
          >
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
              DevScope Score
            </p>
            <div className="font-heading font-black text-7xl md:text-8xl tracking-tighter">
              <AnimatedScore target={scoreBreakdown.total} color={scoreColor} />
              <span className="text-3xl text-muted-foreground font-normal">/100</span>
            </div>
            <div className="mt-3">
              <HiringBadge rec={aiInsights.hiringRecommendation} animated />
            </div>
            <p className="mt-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Deterministic 5-Category Rating
            </p>
          </div>

          {/* Languages Pie */}
          <div
            className="border-4 border-black bg-white p-6 shadow-[8px_8px_0_#000] flex flex-col justify-between will-change-transform"
            style={{ transform: "rotate(-0.3deg)" }}
            onMouseEnter={cardHover.onMouseEnter}
            onMouseLeave={cardHover.onMouseLeave}
          >
            <h3 className="font-heading font-bold uppercase text-lg mb-2">Tech Diversity</h3>
            {langData.length > 0 ? (
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={langData} cx="50%" cy="50%" outerRadius={60} dataKey="value" stroke="#000" strokeWidth={2}>
                      {langData.map((_, i) => (
                        <Cell key={i} fill={LANG_COLORS[i % LANG_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: number) => [`${val}%`, "Share"]}
                      contentStyle={{ border: "2px solid #000", fontWeight: "bold" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm font-medium my-auto text-center">No language data available</p>
            )}

            <div className="flex flex-wrap gap-2 mt-2">
              {langData.slice(0, 5).map((l, i) => (
                <span
                  key={l.name}
                  className="inline-flex items-center gap-1 text-xs font-bold border border-black px-2 py-0.5 bg-gray-50"
                >
                  <span className="w-2 h-2 rounded-full border border-black" style={{ backgroundColor: LANG_COLORS[i % LANG_COLORS.length] }} />
                  {l.name} ({l.value}%)
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Feature 1: Embeddable GitHub README SVG Score Badge ────────── */}
        <div className="reveal border-4 border-black bg-white p-7 shadow-[8px_8px_0_#000]">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b-2 border-black pb-4 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                <h3 className="font-heading font-black text-xl uppercase">Embed Score in GitHub Profile</h3>
              </div>
              <p className="text-sm text-muted-foreground font-medium mt-0.5">
                Display your live DevScope verification badge on your GitHub profile README.md.
              </p>
            </div>
            <button
              onClick={handleCopyBadge}
              className="flex items-center gap-2 border-2 border-black bg-primary text-black px-5 py-2.5 font-black uppercase text-sm shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] hover:-translate-y-0.5 transition-all"
            >
              {badgeCopied ? <Check className="w-4 h-4 text-green-800" /> : <Copy className="w-4 h-4" />}
              {badgeCopied ? "Markdown Copied!" : "Copy README Badge Markdown"}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 bg-zinc-900 border-2 border-black p-5 text-white">
            <div className="flex-shrink-0">
              <img
                src={apiUrl(`/api/badge/${username}.svg`)}
                alt="DevScope Score Badge"
                className="max-w-full h-auto drop-shadow-md"
              />
            </div>
            <div className="flex-1 font-mono text-xs text-zinc-300 break-all bg-black/50 p-3 border border-zinc-700">
              <code>{`[![DevScope Rating](${apiUrl(`/api/badge/${username}.svg`)})](${window.location.origin}/report/${username})`}</code>
            </div>
          </div>
        </div>

        {/* Category Breakdown Progress Bars */}
        <div ref={breakdownRef} className="reveal border-4 border-black bg-white p-8 shadow-[8px_8px_0_#000]">
          <h2 className="font-heading font-black uppercase text-2xl mb-6">Score Breakdown</h2>
          <div className="space-y-5">
            {[
              { label: "Repo Quality", val: scoreBreakdown.repoQuality, max: 30, color: "bg-primary" },
              { label: "Activity Consistency", val: scoreBreakdown.activityConsistency, max: 25, color: "bg-green-400" },
              { label: "Tech Diversity", val: scoreBreakdown.techDiversity, max: 20, color: "bg-blue-400" },
              { label: "Popularity & Reach", val: scoreBreakdown.popularity, max: 15, color: "bg-purple-400" },
              { label: "Profile Completeness", val: scoreBreakdown.completeness, max: 10, color: "bg-yellow-300" },
            ].map(({ label, val, max, color }) => (
              <div key={label}>
                <div className="flex justify-between font-bold text-sm mb-1.5 uppercase tracking-wide">
                  <span>{label}</span>
                  <span>{val} / {max}</span>
                </div>
                <div className="w-full h-5 bg-gray-100 border-2 border-black overflow-hidden shadow-[2px_2px_0_#000]">
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

        {/* Quick Stats Grid */}
        <div ref={statsRef} className="reveal grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Public Repos", val: repoStats.totalRepos, icon: <Book className="w-5 h-5 text-primary" /> },
            { label: "Total Stars", val: repoStats.totalStars, icon: <Star className="w-5 h-5 text-yellow-500" /> },
            { label: "Total Forks", val: repoStats.totalForks, icon: <GitFork className="w-5 h-5 text-blue-500" /> },
            { label: "Avg Stars / Repo", val: repoStats.avgStarsPerRepo, icon: <Star className="w-5 h-5 text-green-500" /> },
          ].map(({ label, val, icon }) => (
            <div
              key={label}
              className="stat-card border-4 border-black bg-white p-5 shadow-[4px_4px_0_#000] will-change-transform"
              onMouseEnter={cardHover.onMouseEnter}
              onMouseLeave={cardHover.onMouseLeave}
            >
              <div className="flex items-center gap-2 mb-2">
                {icon}
                <p className="font-bold text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
              </div>
              <p className="font-heading font-black text-3xl">{val.toLocaleString()}</p>
            </div>
          ))}
        </div>

        {/* AI Insights & Recruiter Assessment */}
        <div ref={insightsRef} className="reveal border-4 border-black bg-white p-8 shadow-[8px_8px_0_#000]">
          <div className="flex items-center justify-between mb-6 border-b-4 border-black pb-4">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-primary">Gemini Flash Lite</span>
              <h2 className="font-heading font-black uppercase text-2xl mt-0.5">Recruiter Assessment</h2>
            </div>
            <HiringBadge rec={aiInsights.hiringRecommendation} />
          </div>

          <div className="border-2 border-black p-4 mb-6 bg-gray-50 shadow-[3px_3px_0_#000]">
            <p className="font-medium text-sm leading-relaxed italic">
              "{aiInsights.summary}"
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="insight-card border-2 border-black p-5 shadow-[3px_3px_0_#000] bg-green-50 will-change-transform" style={{ transform: "rotate(-0.5deg)" }}>
              <h3 className="font-heading font-bold uppercase mb-4 border-b-2 border-black pb-1 text-green-700">Strengths</h3>
              <ul className="space-y-2.5">
                {aiInsights.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm font-medium">
                    <span className="text-green-600 font-black">✓</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            <div className="insight-card border-2 border-black p-5 shadow-[3px_3px_0_#000] bg-red-50 will-change-transform" style={{ transform: "rotate(0.5deg)" }}>
              <h3 className="font-heading font-bold uppercase mb-4 border-b-2 border-black pb-1 text-red-700">Weaknesses</h3>
              <ul className="space-y-2.5">
                {aiInsights.weaknesses.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm font-medium">
                    <span className="text-red-500 font-black">✕</span>
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

        {/* ── Feature 2: Interactive 30-Day Growth Roadmap with Target Role Selector ── */}
        <div className="reveal border-4 border-black bg-white shadow-[8px_8px_0_#000]">
          {/* Section header */}
          <div className="px-7 pt-7 pb-5 border-b-2 border-black flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-primary border-b-2 border-primary pb-0.5">Gemini AI</span>
                <span className="text-xs font-bold uppercase px-2 py-0.5 bg-green-100 border border-black">Role-Tailored</span>
              </div>
              <h2 className="font-heading font-black uppercase text-2xl mt-1">📅 30-Day Growth Roadmap</h2>
              <p className="text-sm text-muted-foreground font-medium mt-0.5">
                Select your target career path below to dynamically regenerate custom milestones.
              </p>
            </div>
            <button
              onClick={() => {
                resetWeeklyPlan();
                handleTriggerPlan(targetRole, true);
              }}
              disabled={weekPlanPending}
              className="flex-shrink-0 flex items-center gap-2 border-2 border-black bg-white px-5 py-2.5 font-black uppercase text-sm shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {weekPlanPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-primary rounded-full animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Regenerate Fresh Tasks
                </>
              )}
            </button>
          </div>

          {/* Role Selector Pills */}
          <div className="px-7 py-4 bg-gray-50 border-b-2 border-black flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground mr-1 flex items-center gap-1">
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

          {/* Week Cards & Tasks */}
          <div className="px-7 pb-7 pt-6">
            {weekPlanPending ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-6 h-6 border-2 border-black border-t-primary rounded-full animate-spin flex-shrink-0" />
                  <p className="font-bold text-sm uppercase tracking-wide text-muted-foreground">
                    Gemini AI is crafting your personalized {ROLE_OPTIONS.find((r) => r.id === targetRole)?.label} roadmap…
                  </p>
                </div>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-24 border-4 border-black bg-gray-50 animate-pulse shadow-[4px_4px_0_#000]" style={{ opacity: 1 - i * 0.15 }} />
                ))}
              </div>
            ) : weeklyPlan ? (
              <div ref={weekPlanRef} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {(
                  [
                    { key: "week1", label: "Week 1: Immediate Wins", emoji: "🔥", accentBorder: "border-l-red-400", headerBg: "bg-red-50", badgeBg: "bg-red-400" },
                    { key: "week2", label: "Week 2: Architectural Depth", emoji: "🚀", accentBorder: "border-l-primary", headerBg: "bg-orange-50", badgeBg: "bg-primary" },
                    { key: "week3", label: "Week 3: Domain Specialization", emoji: "✅", accentBorder: "border-l-blue-400", headerBg: "bg-blue-50", badgeBg: "bg-blue-400" },
                    { key: "week4", label: "Week 4: Industry Polish & Visibility", emoji: "⭐", accentBorder: "border-l-purple-400", headerBg: "bg-purple-50", badgeBg: "bg-purple-400" },
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
                      className={`week-card border-4 border-black shadow-[4px_4px_0_#000] border-l-8 ${accentBorder} overflow-hidden will-change-transform relative bg-white`}
                      onMouseEnter={cardHover.onMouseEnter}
                      onMouseLeave={cardHover.onMouseLeave}
                    >
                      <button
                        onClick={() => toggleWeekCollapse(key)}
                        className={`w-full flex items-center justify-between px-5 py-4 ${isCurrentWeek ? "bg-black text-white" : headerBg} hover:brightness-95 transition-all text-left`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-9 h-9 border-2 ${isCurrentWeek ? "border-white bg-white text-black" : "border-black " + badgeBg} flex items-center justify-center text-lg font-black flex-shrink-0`}>
                            {allDone ? "✓" : emoji}
                          </span>
                          <div>
                            <p className={`font-heading font-black uppercase text-base leading-tight ${isCurrentWeek ? "text-white" : "text-black"}`}>
                              {label}
                            </p>
                            <p className={`text-xs font-semibold ${isCurrentWeek ? "text-white/70" : "text-muted-foreground"}`}>
                              {doneCount}/{tasks.length} tasks completed
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
                                className={`flex items-start gap-4 px-5 py-4 transition-colors ${isDone ? "bg-green-50" : "bg-white hover:bg-gray-50"}`}
                              >
                                <button
                                  onClick={() => toggleWeekCheck(ck)}
                                  aria-label={isDone ? "Mark incomplete" : "Mark complete"}
                                  className={`mt-0.5 w-6 h-6 border-2 border-black flex-shrink-0 flex items-center justify-center transition-all shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] hover:-translate-y-0.5 ${
                                    isDone ? "bg-green-400" : "bg-white"
                                  }`}
                                >
                                  {isDone && <span className="text-xs font-black">✓</span>}
                                </button>
                                <span className={`flex-1 font-semibold text-sm leading-snug ${isDone ? "line-through text-muted-foreground" : ""}`}>
                                  {task}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      )}

                      <div className="w-full h-2 bg-gray-100 border-t-2 border-black">
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
              <p className="text-muted-foreground text-center py-6">Could not load roadmap. Click Regenerate to retry.</p>
            )}

            {/* Overall progress bar */}
            {weeklyPlan && (() => {
              const allKeys: (keyof WeeklyRoadmap & `week${number}`)[] = ["week1", "week2", "week3", "week4"];
              const allTasks = allKeys.flatMap((k) => (weeklyPlan[k] as string[]) ?? []);
              const totalCount = allTasks.length;
              const doneCount = allKeys.flatMap((k, wi) =>
                ((weeklyPlan[k] as string[]) ?? []).map((_, ti) => `week${wi + 1}-${ti}`)
              ).filter((ck) => weekChecked.has(ck)).length;
              const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

              return (
                <div className="mt-6 border-2 border-black p-4 bg-background shadow-[3px_3px_0_#000]">
                  <div className="flex justify-between font-bold text-sm mb-2 uppercase tracking-wide">
                    <span>30-Day Plan Completion (Saved across visits)</span>
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
                      🎉 30-Day plan fully completed! Outstanding work.
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* ── Feature 3: Recruiter Technical Interview Simulator ──────────── */}
        <div className="reveal border-4 border-black bg-white p-7 shadow-[8px_8px_0_#000]">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b-2 border-black pb-4 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                <h3 className="font-heading font-black text-xl uppercase">Recruiter Technical Interview Simulator</h3>
              </div>
              <p className="text-sm text-muted-foreground font-medium mt-0.5">
                AI predicts the exact technical questions engineering recruiters and bar raisers will ask based on @{username}'s repositories.
              </p>
            </div>
            <button
              onClick={handleFetchInterviewPrep}
              disabled={interviewLoading}
              className="flex items-center gap-2 border-2 border-black bg-white px-5 py-2.5 font-black uppercase text-sm shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] hover:-translate-y-0.5 transition-all disabled:opacity-40"
            >
              {interviewLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-primary rounded-full animate-spin" />
                  Analyzing Repos…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-primary" />
                  {interviewQuestions.length > 0 ? "Regenerate Questions" : "Generate Interview Questions"}
                </>
              )}
            </button>
          </div>

          {interviewQuestions.length === 0 && !interviewLoading && (
            <div className="text-center py-8 border-2 border-dashed border-black bg-gray-50">
              <p className="font-heading font-bold uppercase text-base mb-2">Simulate a Recruiter Screen</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mb-4 font-medium">
                Click the button above to have Gemini review your actual repositories and generate 4 architectural interview questions with ideal talking points.
              </p>
              <button
                onClick={handleFetchInterviewPrep}
                className="border-2 border-black bg-primary px-5 py-2 font-bold uppercase text-xs shadow-[3px_3px_0_#000] hover:-translate-y-0.5 transition-all"
              >
                Start Simulation
              </button>
            </div>
          )}

          {interviewQuestions.length > 0 && (
            <div className="space-y-4">
              {interviewQuestions.map((q, idx) => {
                const isExpanded = interviewExpanded === idx;
                return (
                  <div key={idx} className="border-2 border-black shadow-[3px_3px_0_#000] overflow-hidden bg-white">
                    <button
                      onClick={() => setInterviewExpanded(isExpanded ? null : idx)}
                      className="w-full text-left p-4 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <span className="font-heading font-black text-primary text-base">Q{idx + 1}.</span>
                        <div>
                          <p className="font-bold text-sm leading-snug">{q.question}</p>
                          <span className="inline-block mt-1 text-xs font-black uppercase tracking-wider text-muted-foreground">
                            Focus: {q.contextRepo} · {q.difficulty}
                          </span>
                        </div>
                      </div>
                      <ChevronDown className={`w-5 h-5 flex-shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </button>

                    {isExpanded && (
                      <div className="p-4 bg-gray-50 border-t-2 border-black space-y-3 text-xs font-medium">
                        <div className="border-l-4 border-primary pl-3 py-1 bg-white">
                          <p className="font-bold uppercase tracking-wider text-muted-foreground mb-0.5">What Interviewers Are Looking For:</p>
                          <p className="text-black/80">{q.signalsLookedFor}</p>
                        </div>
                        <div className="border-l-4 border-green-500 pl-3 py-1 bg-white">
                          <p className="font-bold uppercase tracking-wider text-green-700 mb-0.5">Key Talking Points & Strategy:</p>
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

        {/* ── Feature 4: Resume & Portfolio Bullet Point Generator ──────── */}
        <div className="reveal border-4 border-black bg-white p-7 shadow-[8px_8px_0_#000]">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b-2 border-black pb-4 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" />
                <h3 className="font-heading font-black text-xl uppercase">Resume & Portfolio Bullet Point Generator</h3>
              </div>
              <p className="text-sm text-muted-foreground font-medium mt-0.5">
                Converts top repositories into high-impact bullets following Google's "X-Y-Z" format with quantified metrics.
              </p>
            </div>
            <button
              onClick={handleFetchResumeBullets}
              disabled={resumeLoading}
              className="flex items-center gap-2 border-2 border-black bg-white px-5 py-2.5 font-black uppercase text-sm shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] hover:-translate-y-0.5 transition-all disabled:opacity-40"
            >
              {resumeLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-primary rounded-full animate-spin" />
                  Generating Bullets…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-primary" />
                  {resumeBullets.length > 0 ? "Regenerate Bullets" : "Extract Resume Bullets"}
                </>
              )}
            </button>
          </div>

          {resumeBullets.length === 0 && !resumeLoading && (
            <div className="text-center py-8 border-2 border-dashed border-black bg-gray-50">
              <p className="font-heading font-bold uppercase text-base mb-2">Instant Resume Optimization</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mb-4 font-medium">
                Transform your code into bullet points ready to copy directly into your CV, LinkedIn, or portfolio.
              </p>
              <button
                onClick={handleFetchResumeBullets}
                className="border-2 border-black bg-primary px-5 py-2 font-bold uppercase text-xs shadow-[3px_3px_0_#000] hover:-translate-y-0.5 transition-all"
              >
                Generate Bullets
              </button>
            </div>
          )}

          {resumeBullets.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resumeBullets.map((b, idx) => (
                <div key={idx} className="border-2 border-black p-4 bg-white shadow-[3px_3px_0_#000] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black uppercase tracking-wider bg-gray-100 border border-black px-2 py-0.5">
                        {b.repoName}
                      </span>
                      <span className="text-xs font-bold text-primary">{b.quantifiedImpact}</span>
                    </div>
                    <p className="text-sm font-semibold leading-relaxed text-black/90 mb-3">
                      • {b.bullet}
                    </p>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-200 pt-2">
                    <div className="flex gap-1 flex-wrap">
                      {b.techStack?.map((t: string) => (
                        <span key={t} className="text-[10px] font-bold bg-gray-50 border border-gray-300 px-1.5 py-0.5">
                          {t}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => handleCopyBullet(b.bullet, idx)}
                      className="flex items-center gap-1 text-xs font-black uppercase border border-black px-2.5 py-1 bg-white hover:bg-gray-100 shadow-[1px_1px_0_#000]"
                    >
                      {copiedBulletIdx === idx ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedBulletIdx === idx ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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

        {/* Share this report CTA */}
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
    </PageTransition>
  );
}
