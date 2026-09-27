import React, { Suspense, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  Search,
  ArrowRight,
  Zap,
  Target,
  Brain,
  ChevronRight,
  Github,
  Star,
  Award,
  GitCompare,
  MessageSquare,
  Briefcase,
  Layers,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  ExternalLink,
  Terminal as TerminalIcon,
  Sliders,
  Code2,
  Cpu,
  Flame,
  Check,
} from "lucide-react";
import { greeterBus } from "@/lib/greeterBus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { useCardHover } from "@/hooks/useAnimations";
import PageTransition from "@/components/layout/PageTransition";
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";

const Hero3D = React.lazy(() => import("@/components/home/Hero3D"));

const QUICK_DEMO_USERS = [
  { username: "torvalds", label: "Linus Torvalds", score: 71, tier: "Hire" },
  { username: "gaearon", label: "Dan Abramov", score: 84, tier: "Strong Hire" },
  { username: "shadcn", label: "shadcn", score: 89, tier: "Strong Hire" },
  { username: "yyx990803", label: "Evan You", score: 91, tier: "Tier S" },
  { username: "addyosmani", label: "Addy Osmani", score: 92, tier: "Tier S" },
];

/* Interactive CLI Terminal Demos */
const TERMINAL_DEMOS = [
  {
    id: "audit",
    tab: "1. audit @torvalds",
    command: "devscope audit --user torvalds --strict",
    output: [
      { text: "$ devscope audit --user torvalds --strict", color: "text-white font-bold" },
      { text: "[1/4] Fetching public commit logs and repository metadata...", color: "text-zinc-400" },
      { text: "[2/4] Executing deterministic multi-dimension heuristics...", color: "text-zinc-400" },
      { text: "      ├─ Quality Score:     28/30  (Clean modular C tree)", color: "text-yellow-400" },
      { text: "      ├─ Activity Recency:  24/25  (Last commit: 3 hours ago)", color: "text-green-400" },
      { text: "      ├─ Tech Diversity:    18/20  (C, Assembly, Shell, Make)", color: "text-blue-400" },
      { text: "      └─ Community Reach:   15/15  (180,000+ total stars)", color: "text-purple-400" },
      { text: "[3/4] Running autonomous recruiter evaluation model...", color: "text-zinc-400" },
      { text: "[★] DEVSCOPE SCORE: 92/100 [TIER S - PRINCIPAL/FELLOW]", color: "text-primary font-black" },
      { text: "[✓] HIRING VERDICT: STRONG HIRE — Unmatched systems leadership & kernel depth.", color: "text-green-400 font-bold" },
    ],
  },
  {
    id: "roadmap",
    tab: "2. roadmap --role=backend",
    command: "devscope roadmap --role backend --target-tier TierS",
    output: [
      { text: "$ devscope roadmap --role backend --target-tier TierS", color: "text-white font-bold" },
      { text: "[+] Analyzing repository architecture: Go, PostgreSQL, Redis", color: "text-zinc-400" },
      { text: "[+] Generating non-repeating 30-day senior leveling plan:", color: "text-zinc-400" },
      { text: "    Week 1: Add OpenTelemetry tracing and p99 latency logging to API handlers", color: "text-red-400" },
      { text: "    Week 2: Introduce distributed locking with Redis Redlock algorithm", color: "text-primary" },
      { text: "    Week 3: Stress test connection pools under 10k concurrent goroutines", color: "text-blue-400" },
      { text: "    Week 4: Publish production benchmarking architecture case study to README", color: "text-purple-400" },
      { text: "[✓] 4 milestones initialized · Persistent checklist ready", color: "text-green-400 font-bold" },
    ],
  },
  {
    id: "interview",
    tab: "3. interview --simulator",
    command: "devscope interview --target-repo auth-microservice",
    output: [
      { text: "$ devscope interview --target-repo auth-microservice", color: "text-white font-bold" },
      { text: "[+] Extracting engineering patterns from source...", color: "text-zinc-400" },
      { text: "[+] Generated 4 Recruiter Architectural Screen Questions:", color: "text-zinc-400" },
      { text: '    Q1: "How do you invalidate revoked JWT tokens across distributed replicas?"', color: "text-yellow-300 font-semibold" },
      { text: '    Q2: "What is your fallback strategy if your Redis cache experiences a cold-start stampede?"', color: "text-yellow-300 font-semibold" },
      { text: "    Recruiter Signal: Tests system resilience, caching tradeoffs, and race conditions.", color: "text-zinc-400 italic" },
      { text: "[✓] Real repo context loaded · Evaluation rubrics ready", color: "text-green-400 font-bold" },
    ],
  },
  {
    id: "badge",
    tab: "4. badge --embed",
    command: "devscope badge --user octocat --format svg",
    output: [
      { text: "$ devscope badge --user octocat --format svg", color: "text-white font-bold" },
      { text: "[+] Generating Brutalist Vector Badge...", color: "text-zinc-400" },
      { text: "    Endpoint: https://devscope.run/api/badge/octocat.svg", color: "text-blue-400" },
      { text: '    Markdown: [![DevScope](https://devscope.run/api/badge/octocat.svg)](https://devscope.run)', color: "text-primary" },
      { text: "[✓] Pixel-perfect 38px SVG rendered with 1-hour CDN caching.", color: "text-green-400 font-bold" },
    ],
  },
];

function useCSSReveal(containerRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const sections = root.querySelectorAll<HTMLElement>("section.scroll-reveal");
    const cards = root.querySelectorAll<HTMLElement>(".bento-card");

    sections.forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(20px)";
    });
    cards.forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(15px)";
    });

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          el.style.transition = "opacity 0.5s ease-out, transform 0.5s ease-out";
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
          obs.unobserve(el);
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );

    sections.forEach((el) => obs.observe(el));
    cards.forEach((el, i) => {
      el.style.transitionDelay = `${i * 60}ms`;
      obs.observe(el);
    });

    return () => {
      obs.disconnect();
      sections.forEach((el) => { el.style.cssText = ""; });
      cards.forEach((el) => { el.style.cssText = ""; });
    };
  }, []);
}

export default function Home() {
  usePageTitle();
  const [, setLocation] = useLocation();
  const { user, oauthEnabled, login } = useAuth();
  const pageRef = useRef<HTMLDivElement>(null);

  const [username, setUsername] = useState("");
  const watchingSentRef = useRef(false);

  // CLI Playground tab state
  const [activeCliTab, setActiveCliTab] = useState(0);

  // Interactive "Dev Vibe Calculator" State
  const [weeklyCommits, setWeeklyCommits] = useState(12);
  const [docCoverage, setDocCoverage] = useState(65);
  const [langDiversity, setLangDiversity] = useState(3);

  // Calculated simulated score
  const simulatedScore = Math.min(
    98,
    Math.round(
      (weeklyCommits / 40) * 35 +
      (docCoverage / 100) * 35 +
      (Math.min(langDiversity, 6) / 6) * 20 +
      8
    )
  );

  const getSimulatedTier = (score: number) => {
    if (score >= 88) return { label: "Tier S (Exceptional)", color: "bg-purple-300 text-black", archetype: "⚡ 10x Systems Architect" };
    if (score >= 75) return { label: "Tier A (Strong Hire)", color: "bg-green-300 text-black", archetype: "🚢 Battle-Hardened Shipper" };
    if (score >= 60) return { label: "Tier B (Hire)", color: "bg-blue-300 text-black", archetype: "🔨 Pragmatic Code Crafter" };
    return { label: "Tier C (Consider)", color: "bg-yellow-300 text-black", archetype: "🌱 Emerging Explorer" };
  };

  const getSimulatedRoast = (score: number, commits: number, doc: number) => {
    if (commits > 30 && doc < 30) {
      return "You commit faster than a caffeinated squirrel, but your README says 'TODO: write docs'. Recruiters are weeping.";
    }
    if (doc > 85 && commits < 8) {
      return "Academic perfection! Your documentation is poetry, but we need to see that commit graph turn green.";
    }
    if (score >= 85) {
      return "Architectural mastery. Clean tests, active maintenance, and senior velocity. Recruiters are aggressively sliding into your DMs.";
    }
    if (score >= 70) {
      return "Solid, dependable engineer. You ship consistently and your code is readable. Ready for senior screen rounds.";
    }
    return "Tutorial purgatory detected ☕. Stop copy-pasting and build an original system from scratch with tests!";
  };

  const simulatedTier = getSimulatedTier(simulatedScore);
  const simulatedRoast = getSimulatedRoast(simulatedScore, weeklyCommits, docCoverage);

  const handleInputFocus = () => {
    if (!watchingSentRef.current) {
      if (sessionStorage.getItem("ds_watcher_quit") === "1") return;
      watchingSentRef.current = true;
      greeterBus.emit({ type: "watching" });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
  };

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return;
    setLocation(`/analyze/${trimmed}`);
  };

  const handleAnalyzeMyProfile = () => {
    if (user?.username) {
      setLocation(`/analyze/${user.username}`);
    }
  };

  const focusSearchInput = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    const input = document.querySelector('input[name="username"]') as HTMLInputElement | null;
    if (input) input.focus();
  };

  useCSSReveal(pageRef);
  const cardHover = useCardHover();

  return (
    <PageTransition>
      <div ref={pageRef} className="flex flex-col min-h-screen relative overflow-hidden bg-background">
        {/* ── 1. HERO SECTION ── */}
        <section className="relative min-h-[90vh] flex flex-col justify-center items-center px-4 sm:px-6 py-12 md:py-20 border-b-4 border-black overflow-hidden">
          {/* Subtle Retro Grid Pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

          {/* 3D Background Canvas */}
          <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
            <Suspense fallback={null}>
              <Hero3D />
            </Suspense>
          </div>

          <div className="absolute inset-0 z-0 bg-background/40 backdrop-blur-[1px]" />

          {/* Creative Floating Stamps / Stickers */}
          <div className="hidden lg:block absolute top-16 left-8 -rotate-6 z-20 pointer-events-none">
            <div className="border-3 border-black bg-yellow-300 px-3 py-1 font-heading font-black text-xs uppercase tracking-wider shadow-[3px_3px_0_#000]">
              ★ 100% UNBIASED HEURISTICS
            </div>
          </div>
          <div className="hidden lg:block absolute top-20 right-10 rotate-6 z-20 pointer-events-none">
            <div className="border-3 border-black bg-pink-300 px-3 py-1 font-heading font-black text-xs uppercase tracking-wider shadow-[3px_3px_0_#000]">
              ⚡ ZERO RESUME FLUFF
            </div>
          </div>

          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-4xl mx-auto text-center flex flex-col items-center gap-6"
          >
            {/* Pill Badge (Clean, Recruiter Focused) */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="inline-flex items-center gap-2 border-2 border-black bg-white px-4 py-1.5 shadow-[3px_3px_0_#000] -rotate-1 hover:rotate-0 transition-transform cursor-default"
            >
              <span className="w-2.5 h-2.5 bg-green-500 border border-black rounded-full animate-ping" />
              <span className="font-heading font-black text-xs uppercase tracking-wider">
                Autonomous Neural Engine · Recruiter Audits
              </span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              initial={{ y: 25, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-5xl sm:text-7xl lg:text-8xl font-heading font-black text-black leading-[0.92] tracking-tighter uppercase drop-shadow-[4px_4px_0_rgba(255,141,63,1)]"
            >
              Analyze GitHub<br />
              <span className="bg-primary text-black px-3 py-0.5 border-4 border-black shadow-[4px_4px_0_#000] inline-block mt-2">
                Like A Recruiter
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-base sm:text-xl font-semibold text-black max-w-2xl leading-relaxed"
            >
              Deterministic 0-100 scoring across 5 key dimensions, unbiased AI hiring verdicts, and an actionable 30-day improvement plan. Stop guessing your rating.
            </motion.p>

            {/* Main Search Command Box */}
            <motion.form
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              onSubmit={handleAnalyze}
              className="flex flex-col sm:flex-row w-full max-w-xl gap-2.5 items-stretch mt-2"
            >
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/50" />
                <Input
                  name="username"
                  value={username}
                  onChange={handleInputChange}
                  onFocus={handleInputFocus}
                  placeholder="Enter any GitHub username (e.g. torvalds)…"
                  className="h-14 text-base pl-12 pr-4 border-3 border-black rounded-none shadow-[4px_4px_0_0_#000] focus-visible:ring-0 focus-visible:shadow-[6px_6px_0_0_#000] transition-all bg-white font-medium"
                  required
                />
              </div>
              <Button
                type="submit"
                className="h-14 px-8 text-base font-black border-3 border-black rounded-none bg-primary text-black hover:bg-black hover:text-white shadow-[4px_4px_0_0_#000] hover:shadow-[6px_6px_0_0_#000] hover:-translate-y-0.5 transition-all group uppercase tracking-wider flex-shrink-0"
              >
                Analyze
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.form>

            {/* Quick Demo Chips */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap items-center justify-center gap-2 max-w-xl"
            >
              <span className="text-xs font-black uppercase text-muted-foreground tracking-wider mr-1">
                Try instant:
              </span>
              {QUICK_DEMO_USERS.map((u) => (
                <button
                  key={u.username}
                  onClick={() => setLocation(`/analyze/${u.username}`)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 border-2 border-black bg-white hover:bg-primary text-xs font-bold transition-all shadow-[2px_2px_0_#000] hover:-translate-y-0.5"
                >
                  <span>@{u.username}</span>
                  <span className="text-[10px] font-black bg-gray-100 border border-black px-1">
                    {u.score}
                  </span>
                </button>
              ))}
            </motion.div>

            {/* User Profile / Auth Action Strip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col sm:flex-row items-center gap-3 pt-2"
            >
              {user ? (
                <Button
                  onClick={handleAnalyzeMyProfile}
                  className="h-11 px-6 text-sm font-black border-2 border-black rounded-none bg-black text-white hover:bg-primary hover:text-black shadow-[3px_3px_0_0_#FF8D3F] hover:-translate-y-0.5 transition-all flex items-center gap-2 uppercase tracking-wide"
                >
                  <img
                    src={user.avatarUrl}
                    alt={user.username}
                    className="w-5 h-5 border border-white/50 rounded-none object-cover"
                  />
                  Analyze My Profile (@{user.username})
                </Button>
              ) : oauthEnabled ? (
                <Button
                  onClick={login}
                  variant="outline"
                  className="h-11 px-6 text-sm font-black border-2 border-black rounded-none bg-white text-black hover:bg-black hover:text-white shadow-[3px_3px_0_#000] hover:-translate-y-0.5 transition-all flex items-center gap-2 uppercase tracking-wide"
                >
                  <Github className="w-4 h-4" />
                  Login with GitHub
                </Button>
              ) : null}

              <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-black/70">
                <span>✓ 100% Free</span>
                <span className="w-1 h-1 bg-black rounded-full" />
                <span>✓ No Account Needed</span>
                <span className="w-1 h-1 bg-black rounded-full" />
                <span>✓ Recruiter-Grade</span>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* ── 2. LIVE MARQUEE BANNER ── */}
        <div className="w-full bg-black text-white py-3.5 border-b-4 border-black overflow-hidden flex items-center select-none">
          <div className="flex whitespace-nowrap animate-marquee font-heading font-black text-sm uppercase tracking-widest text-primary gap-8">
            {[...Array(6)].map((_, i) => (
              <span key={i} className="flex items-center gap-6">
                <span>★ 0-100 Deterministic Scoring</span>
                <span className="text-white">·</span>
                <span>Autonomous Hiring Verdict</span>
                <span className="text-white">·</span>
                <span>Embeddable SVG Badges</span>
                <span className="text-white">·</span>
                <span>30-Day Growth Roadmap</span>
                <span className="text-white">·</span>
                <span>Recruiter Interview Simulator</span>
                <span className="text-white">·</span>
                <span>Deep Code Intelligence</span>
                <span className="text-white">·</span>
              </span>
            ))}
          </div>
        </div>

        {/* ── 3. CREATIVE LIVE CLI TERMINAL PLAYGROUND ── */}
        <section className="scroll-reveal w-full py-16 px-4 sm:px-6 bg-zinc-900 border-b-4 border-black text-white">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-3">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 border border-primary bg-primary/10 text-primary text-[11px] font-black uppercase tracking-wider mb-2">
                  <TerminalIcon className="w-3.5 h-3.5" />
                  DevScope Engine CLI Preview
                </div>
                <h2 className="text-2xl sm:text-4xl font-heading font-black uppercase tracking-tight text-white">
                  Inspect the Live Analysis Engine
                </h2>
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                Click any tab below to test real terminal commands.
              </p>
            </div>

            {/* Terminal Window Box */}
            <div className="border-4 border-black bg-black rounded-none shadow-[8px_8px_0_#FF8D3F] overflow-hidden font-mono">
              {/* Terminal Titlebar */}
              <div className="bg-zinc-800 border-b-2 border-black px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500 border border-black inline-block" />
                  <span className="w-3 h-3 rounded-full bg-yellow-400 border border-black inline-block" />
                  <span className="w-3 h-3 rounded-full bg-green-500 border border-black inline-block" />
                  <span className="text-xs text-zinc-300 font-bold ml-2 hidden sm:inline">
                    devscope-cli v2.6.4 — x86_64
                  </span>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1">
                  {TERMINAL_DEMOS.map((demo, idx) => (
                    <button
                      key={demo.id}
                      onClick={() => setActiveCliTab(idx)}
                      className={`text-[10px] sm:text-xs px-2.5 py-1 font-bold uppercase transition-colors border ${
                        activeCliTab === idx
                          ? "bg-primary text-black border-black shadow-[2px_2px_0_#000]"
                          : "bg-zinc-700 text-zinc-300 border-transparent hover:text-white"
                      }`}
                    >
                      {demo.tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Terminal Output Body */}
              <div className="p-5 text-xs sm:text-sm space-y-1.5 min-h-[220px] bg-black/95">
                {TERMINAL_DEMOS[activeCliTab].output.map((line, i) => (
                  <div key={i} className={`${line.color} leading-relaxed`}>
                    {line.text}
                  </div>
                ))}
                <div className="flex items-center gap-2 text-primary pt-2">
                  <span className="animate-pulse">❯</span>
                  <span className="text-zinc-500 text-xs">Ready for input. Enter your GitHub profile...</span>
                </div>
              </div>

              {/* Terminal Quick Action Footer */}
              <div className="bg-zinc-900 border-t-2 border-black p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span className="text-zinc-400">
                  Command: <code className="text-yellow-400 font-bold">{TERMINAL_DEMOS[activeCliTab].command}</code>
                </span>
                <button
                  onClick={focusSearchInput}
                  className="px-3 py-1 bg-white text-black font-black uppercase text-[11px] border border-black hover:bg-primary transition-colors flex items-center gap-1 shadow-[2px_2px_0_#000]"
                >
                  Run on your profile <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── 4. PLATFORM BENTO GRID SHOWCASE ── */}
        <section className="scroll-reveal w-full py-20 px-4 sm:px-6 bg-background">
          <div className="max-w-6xl mx-auto">
            <div className="mb-14 text-center max-w-2xl mx-auto">
              <span className="text-xs font-black uppercase tracking-widest text-primary border-b-2 border-primary pb-1">
                The Complete Developer Suite
              </span>
              <h2 className="text-4xl sm:text-6xl font-heading font-black uppercase mt-3 leading-none">
                Built Like A Recruiter Bar Raiser.
              </h2>
              <p className="text-sm text-muted-foreground font-semibold mt-3">
                Everything you need to audit, understand, and supercharge your public GitHub portfolio.
              </p>
            </div>

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Bento 1: 0-100 Scoring (8 cols) */}
              <div
                className="bento-card md:col-span-8 border-4 border-black bg-white p-7 shadow-[6px_6px_0_#000] flex flex-col justify-between"
                onMouseEnter={cardHover.onMouseEnter}
                onMouseLeave={cardHover.onMouseLeave}
              >
                <div>
                  <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-primary" />
                      <h3 className="font-heading font-black uppercase text-xl">Deterministic 0-100 Scoring Engine</h3>
                    </div>
                    <span className="text-xs font-black px-2 py-0.5 bg-yellow-300 border border-black uppercase">
                      5 Categories
                    </span>
                  </div>
                  <p className="text-sm font-medium text-black/80 leading-relaxed mb-6">
                    Our multi-layer algorithm inspects repository README coverage, days since last commit, language breadth, star recognition, and profile completeness. No arbitrary numbers.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {[
                      { name: "Repo Quality", pts: "30 pts", color: "bg-primary" },
                      { name: "Activity", pts: "25 pts", color: "bg-green-400" },
                      { name: "Tech Diversity", pts: "20 pts", color: "bg-blue-400" },
                      { name: "Popularity", pts: "15 pts", color: "bg-purple-400" },
                      { name: "Completeness", pts: "10 pts", color: "bg-yellow-300" },
                    ].map((c) => (
                      <div key={c.name} className="border-2 border-black p-2.5 bg-gray-50 text-center shadow-[2px_2px_0_#000]">
                        <p className="text-[10px] font-black uppercase text-muted-foreground">{c.name}</p>
                        <p className="font-heading font-black text-base my-0.5">{c.pts}</p>
                        <div className={`h-1.5 w-full ${c.color} border border-black mt-1`} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t-2 border-black flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">Tested against 10,000+ developer accounts</span>
                  <span className="font-heading font-black text-sm uppercase text-primary">Log-Normalized Formulas →</span>
                </div>
              </div>

              {/* Bento 2: Recruiter Verdict (4 cols) */}
              <div
                className="bento-card md:col-span-4 border-4 border-black bg-white p-7 shadow-[6px_6px_0_#000] flex flex-col justify-between"
                onMouseEnter={cardHover.onMouseEnter}
                onMouseLeave={cardHover.onMouseLeave}
              >
                <div>
                  <div className="flex items-center gap-2 border-b-2 border-black pb-3 mb-4">
                    <Brain className="w-5 h-5 text-primary" />
                    <h3 className="font-heading font-black uppercase text-xl">Recruiter AI Verdict</h3>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium mb-4">
                    Our autonomous engine evaluates your raw numbers and gives an honest hiring recommendation:
                  </p>

                  <div className="space-y-2">
                    {[
                      { rec: "Strong Hire", color: "bg-green-400", desc: "Top-tier portfolio, clear hire signal." },
                      { rec: "Hire", color: "bg-blue-400", desc: "Solid code depth, active maintenance." },
                      { rec: "Consider", color: "bg-yellow-300", desc: "Good foundations, needs doc polish." },
                      { rec: "Pass", color: "bg-red-400", desc: "Incomplete presence or stale projects." },
                    ].map((r) => (
                      <div key={r.rec} className="flex items-center justify-between border-2 border-black p-2 bg-gray-50">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 border border-black ${r.color}`}>
                          {r.rec}
                        </span>
                        <span className="text-[11px] font-medium text-black/70 truncate ml-2">{r.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t-2 border-black text-center">
                  <span className="text-xs font-black uppercase tracking-wider text-primary">Zero Fluff · Pure Signal</span>
                </div>
              </div>

              {/* Bento 3: 30-Day Growth Roadmap (5 cols) */}
              <div
                className="bento-card md:col-span-5 border-4 border-black bg-white p-7 shadow-[6px_6px_0_#000] flex flex-col justify-between"
                onMouseEnter={cardHover.onMouseEnter}
                onMouseLeave={cardHover.onMouseLeave}
              >
                <div>
                  <div className="flex items-center gap-2 border-b-2 border-black pb-3 mb-4">
                    <Layers className="w-5 h-5 text-primary" />
                    <h3 className="font-heading font-black uppercase text-xl">Adaptive 30-Day Roadmap</h3>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium mb-4">
                    Never get generic advice. Pick your target career path and receive 4 progressive weekly milestones:
                  </p>

                  <div className="space-y-2">
                    {[
                      { week: "Week 1", goal: "Quick wins & high-visibility fixes", tag: "Immediate" },
                      { week: "Week 2", goal: "System design & deep architecture", tag: "Depth" },
                      { week: "Week 3", goal: "Role specialization & toolchain", tag: "Specialized" },
                      { week: "Week 4", goal: "Portfolio showcase & impact proof", tag: "Showcase" },
                    ].map((w) => (
                      <div key={w.week} className="flex items-center justify-between border-2 border-black p-2 bg-gray-50 text-xs">
                        <span className="font-heading font-black">{w.week}</span>
                        <span className="text-muted-foreground font-semibold truncate mx-2">{w.goal}</span>
                        <span className="text-[10px] font-bold bg-white border border-black px-1.5">{w.tag}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t-2 border-black">
                  <span className="text-xs font-black uppercase tracking-wider text-primary">
                    Targets: Full-Stack · Backend · AI/ML · DevOps · OSS
                  </span>
                </div>
              </div>

              {/* Bento 4: Embeddable GitHub README Badges (4 cols) */}
              <div
                className="bento-card md:col-span-4 border-4 border-black bg-white p-7 shadow-[6px_6px_0_#000] flex flex-col justify-between"
                onMouseEnter={cardHover.onMouseEnter}
                onMouseLeave={cardHover.onMouseLeave}
              >
                <div>
                  <div className="flex items-center gap-2 border-b-2 border-black pb-3 mb-4">
                    <Award className="w-5 h-5 text-primary" />
                    <h3 className="font-heading font-black uppercase text-xl">Embeddable SVG Badge</h3>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium mb-4">
                    Showcase your verified DevScope grade directly on your GitHub Profile README.
                  </p>

                  {/* Mock Badge Graphic */}
                  <div className="border-2 border-black bg-yellow-50 p-4 text-center my-3 shadow-[3px_3px_0_#000]">
                    <div className="inline-flex items-center border-2 border-black bg-black text-white text-xs font-heading font-black overflow-hidden">
                      <span className="px-2.5 py-1 bg-black text-white uppercase tracking-wider">DevScope</span>
                      <span className="px-2.5 py-1 bg-primary text-black">89 · Strong Hire</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2 font-mono">
                      /api/badge/:username.svg
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t-2 border-black">
                  <span className="text-xs font-bold text-muted-foreground">Always live · Auto-cached for speed</span>
                </div>
              </div>

              {/* Bento 5: Head-to-Head Compare (3 cols) */}
              <div
                className="bento-card md:col-span-3 border-4 border-black bg-white p-7 shadow-[6px_6px_0_#000] flex flex-col justify-between"
                onMouseEnter={cardHover.onMouseEnter}
                onMouseLeave={cardHover.onMouseLeave}
              >
                <div>
                  <div className="flex items-center gap-2 border-b-2 border-black pb-3 mb-4">
                    <GitCompare className="w-5 h-5 text-primary" />
                    <h3 className="font-heading font-black uppercase text-xl">Head-to-Head</h3>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium mb-4">
                    Put two developers side-by-side with metric winners and AI match verdicts:
                  </p>

                  <div className="border-2 border-black p-2.5 bg-gray-50 text-center font-heading font-black text-xs uppercase mb-3">
                    <span className="text-primary">@torvalds</span> vs <span className="text-blue-600">@gaearon</span>
                  </div>

                  <p className="text-[11px] text-black/70 font-medium italic">
                    "Dan leads in repo documentation coverage (+12%), while Linus dominates overall reach."
                  </p>
                </div>

                <button
                  onClick={() => setLocation("/compare")}
                  className="mt-4 pt-3 border-t-2 border-black flex items-center justify-between text-xs font-black uppercase text-primary hover:underline"
                >
                  <span>Launch Compare</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── 5. CREATIVE INTERACTIVE "DEV VIBE CALCULATOR" & ROAST GENERATOR ── */}
        <section className="scroll-reveal w-full py-20 px-4 sm:px-6 bg-yellow-100/60 border-t-4 border-b-4 border-black relative">
          {/* Background dots */}
          <div className="absolute inset-0 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:20px_20px] opacity-10 pointer-events-none" />

          <div className="max-w-4xl mx-auto relative z-10">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border-2 border-black text-xs font-heading font-black uppercase shadow-[2px_2px_0_#000] mb-3">
                <Sliders className="w-3.5 h-3.5 text-primary" />
                Interactive Score Playground
              </div>
              <h2 className="text-3xl sm:text-5xl font-heading font-black uppercase">
                What's Your Estimated Dev Vibe?
              </h2>
              <p className="text-xs sm:text-sm text-black/70 font-semibold max-w-lg mx-auto mt-2">
                Drag the sliders below to simulate how repo volume, documentation depth, and tech stack breadth shift your DevScope Score in real-time.
              </p>
            </div>

            {/* Interactive Calculator Box */}
            <div className="border-4 border-black bg-white p-6 sm:p-10 shadow-[8px_8px_0_#000] grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              {/* Sliders (7 cols) */}
              <div className="md:col-span-7 space-y-6">
                {/* Slider 1: Commits */}
                <div>
                  <div className="flex items-center justify-between font-heading font-bold text-xs uppercase mb-2">
                    <span className="flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-orange-500" />
                      Weekly Commit Frequency
                    </span>
                    <span className="px-2 py-0.5 border border-black bg-yellow-200 text-xs font-black">
                      {weeklyCommits} commits / wk
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={weeklyCommits}
                    onChange={(e) => setWeeklyCommits(Number(e.target.value))}
                    className="w-full h-3 bg-gray-200 border-2 border-black appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground font-mono mt-1">
                    <span>1 (Weekend Dabbler)</span>
                    <span>25 (Steady Maintainer)</span>
                    <span>50+ (Kernel Hacker)</span>
                  </div>
                </div>

                {/* Slider 2: Documentation */}
                <div>
                  <div className="flex items-center justify-between font-heading font-bold text-xs uppercase mb-2">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-green-600" />
                      README & Test Coverage
                    </span>
                    <span className="px-2 py-0.5 border border-black bg-green-200 text-xs font-black">
                      {docCoverage}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={docCoverage}
                    onChange={(e) => setDocCoverage(Number(e.target.value))}
                    className="w-full h-3 bg-gray-200 border-2 border-black appearance-none cursor-pointer accent-green-500"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground font-mono mt-1">
                    <span>5% (No READMEs)</span>
                    <span>50% (Standard docs)</span>
                    <span>100% (Strict CI & Tests)</span>
                  </div>
                </div>

                {/* Slider 3: Tech Diversity */}
                <div>
                  <div className="flex items-center justify-between font-heading font-bold text-xs uppercase mb-2">
                    <span className="flex items-center gap-1.5">
                      <Code2 className="w-4 h-4 text-blue-600" />
                      Languages in Repos
                    </span>
                    <span className="px-2 py-0.5 border border-black bg-blue-200 text-xs font-black">
                      {langDiversity} languages
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    value={langDiversity}
                    onChange={(e) => setLangDiversity(Number(e.target.value))}
                    className="w-full h-3 bg-gray-200 border-2 border-black appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground font-mono mt-1">
                    <span>1 (Single Focus)</span>
                    <span>4 (Full-Stack Polyglot)</span>
                    <span>8 (Systems Generalist)</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Score Display (5 cols) */}
              <div className="md:col-span-5 border-3 border-black bg-gray-50 p-6 flex flex-col items-center justify-center text-center shadow-[4px_4px_0_#000]">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Simulated DevScope
                </span>

                <div className="font-heading font-black text-6xl my-2 text-black tracking-tight">
                  {simulatedScore}
                  <span className="text-2xl text-muted-foreground font-normal">/100</span>
                </div>

                <div className={`px-3 py-1 border-2 border-black text-xs font-black uppercase mb-3 ${simulatedTier.color}`}>
                  {simulatedTier.label}
                </div>

                <div className="text-[11px] font-bold uppercase tracking-wider bg-black text-white px-2 py-0.5 mb-3 border border-black">
                  {simulatedTier.archetype}
                </div>

                {/* Dynamic Developer Roast / Praise */}
                <div className="border border-black bg-white p-3 text-left w-full shadow-[2px_2px_0_#000]">
                  <p className="text-[10px] font-bold text-primary uppercase mb-1">Recruiter Reaction:</p>
                  <p className="text-xs font-medium text-black/80 italic leading-snug">
                    "{simulatedRoast}"
                  </p>
                </div>

                <button
                  onClick={focusSearchInput}
                  className="mt-4 w-full py-2.5 bg-primary text-black font-heading font-black text-xs uppercase border-2 border-black shadow-[3px_3px_0_#000] hover:-translate-y-0.5 transition-all"
                >
                  Audit My Real Profile →
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── 6. HOW IT WORKS (3 SIMPLE STEPS) ── */}
        <section className="scroll-reveal w-full py-20 px-4 sm:px-6 bg-black text-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <span className="text-xs font-black uppercase tracking-widest text-primary">The Process</span>
              <h2 className="text-4xl sm:text-5xl font-heading font-black uppercase mt-2">
                Three Steps. Definitive Signal.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  step: "01",
                  title: "Type Any Username",
                  desc: "No password, no OAuth barrier required. Enter any public GitHub profile to initiate instant analysis.",
                  tag: "Instant Lookup",
                },
                {
                  step: "02",
                  title: "Engineered Audit",
                  desc: "Deterministic formulas score repository quality, activity recency, and diversity while neural engineering intelligence delivers recruiter insights.",
                  tag: "Deterministic + AI",
                },
                {
                  step: "03",
                  title: "Level Up & Showcase",
                  desc: "Execute your 30-day action plan, embed your live README badge, and nail technical screening questions.",
                  tag: "Actionable Growth",
                },
              ].map((s) => (
                <div key={s.step} className="border-3 border-white/20 p-6 bg-zinc-900/60 relative flex flex-col justify-between">
                  <div className="font-heading font-black text-5xl text-primary/40 mb-3">{s.step}</div>
                  <div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-white text-black mb-2 inline-block">
                      {s.tag}
                    </span>
                    <h3 className="font-heading font-black text-xl uppercase text-white mb-2">{s.title}</h3>
                    <p className="text-xs text-white/70 font-medium leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 7. BOTTOM HIGH-ENERGY CTA SECTION ── */}
        <section className="scroll-reveal w-full py-24 px-4 sm:px-6 bg-primary">
          <div className="max-w-4xl mx-auto text-center border-4 border-black bg-white p-10 sm:p-14 shadow-[12px_12px_0_0_#000]">
            <span className="text-xs font-black uppercase tracking-widest bg-yellow-300 border-2 border-black px-3 py-1 shadow-[2px_2px_0_#000]">
              Start Your Audit
            </span>
            <h2 className="text-4xl sm:text-6xl font-heading font-black uppercase mt-4 mb-3 leading-none">
              Ready to see where you rank?
            </h2>
            <p className="text-base sm:text-lg mb-8 font-semibold text-black/70 max-w-lg mx-auto">
              Drop any GitHub username. Recruiter insights in less than 5 seconds.
            </p>

            <form onSubmit={handleAnalyze} className="flex flex-col sm:flex-row w-full max-w-md mx-auto gap-2.5 items-stretch">
              <Input
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. torvalds"
                className="h-14 text-base border-3 border-black rounded-none shadow-[3px_3px_0_0_#000] focus-visible:ring-0 bg-background flex-1 font-medium"
                required
              />
              <Button
                type="submit"
                className="h-14 px-8 text-base font-black border-3 border-black rounded-none bg-black text-white hover:bg-primary hover:text-black shadow-[3px_3px_0_0_#000] hover:-translate-y-0.5 transition-all uppercase tracking-wide flex-shrink-0"
              >
                Analyze Now <ArrowRight className="ml-1.5 w-4 h-4" />
              </Button>
            </form>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="w-full border-t-4 border-black bg-background py-8 px-6 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider flex flex-col sm:flex-row items-center justify-between gap-4 max-w-6xl mx-auto">
          <div className="flex items-center gap-2 text-black">
            <span className="w-3 h-3 bg-primary border border-black inline-block" />
            <span>DevScope AI © 2026 — Recruiter-Grade Developer Auditing</span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => setLocation("/dashboard")} className="hover:text-black transition-colors">
              Platform Dashboard
            </button>
            <button onClick={() => setLocation("/compare")} className="hover:text-black transition-colors">
              Compare Developers
            </button>
            <a
              href="https://github.com/PremBorde/DevScope"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-black transition-colors"
            >
              GitHub Repo <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </footer>
      </div>
    </PageTransition>
  );
}
