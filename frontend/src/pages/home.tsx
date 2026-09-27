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
  const [, setLocation] = useLocation();
  const { user, oauthEnabled, login } = useAuth();
  const pageRef = useRef<HTMLDivElement>(null);

  const [username, setUsername] = useState("");
  const watchingSentRef = useRef(false);

  const handleInputFocus = () => {
    if (!watchingSentRef.current) {
      if (sessionStorage.getItem("ds_watcher_quit") === "1") return;
      watchingSentRef.current = true;
      greeterBus.emit({ type: "watching" });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUsername(val);
    if (watchingSentRef.current) {
      greeterBus.emit({ type: "typing", value: val });
    }
  };

  useEffect(() => {
    if (user?.username) setUsername(user.username);
  }, [user?.username]);

  usePageTitle("Analyze GitHub Like a Recruiter");
  useCSSReveal(pageRef);

  const handleAnalyze = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const val = username.trim();
    if (!val) return;
    if (watchingSentRef.current) {
      greeterBus.emit({ type: "inputBlur", value: val });
      watchingSentRef.current = false;
    }
    setLocation(`/analyze/${val}`);
  };

  const handleAnalyzeMyProfile = () => {
    const val = user?.username;
    if (!val) return;
    if (watchingSentRef.current) {
      greeterBus.emit({ type: "inputBlur", value: val });
      watchingSentRef.current = false;
    }
    setLocation(`/analyze/${val}`);
  };

  const cardHover = useCardHover();

  return (
    <PageTransition>
      <div ref={pageRef} className="w-full flex flex-col min-h-screen overflow-hidden bg-background">
        {/* ── 1. HERO SECTION ── */}
        <section className="relative w-full min-h-[92vh] flex flex-col items-center justify-center border-b-4 border-black overflow-hidden bg-background px-4 py-16">
          {/* 3D Network Globe Background */}
          <div className="absolute inset-0 z-0">
            <Suspense fallback={<div className="w-full h-full bg-background" />}>
              <Hero3D />
            </Suspense>
          </div>

          <div className="absolute inset-0 z-0 bg-background/40 backdrop-blur-[1px]" />

          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-4xl mx-auto text-center flex flex-col items-center gap-6"
          >
            {/* Pill Badge */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="inline-flex items-center gap-2 border-2 border-black bg-white px-4 py-1.5 shadow-[3px_3px_0_#000] -rotate-1 hover:rotate-0 transition-transform cursor-default"
            >
              <span className="w-2.5 h-2.5 bg-green-500 border border-black rounded-full animate-ping" />
              <span className="font-heading font-black text-xs uppercase tracking-wider">
                Gemini 2.5 Flash Lite · Recruiter AI Audits
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
              Deterministic 0-100 scoring across 5 key dimensions, real Gemini AI hiring verdicts, and an actionable 30-day improvement plan. Stop guessing your rating.
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
                <span>✓ Live AI Insights</span>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* ── 2. LIVE MARQUEE BANNER ── */}
        <div className="w-full bg-black text-white py-3.5 border-b-4 border-black overflow-hidden flex items-center">
          <div className="flex whitespace-nowrap animate-marquee font-heading font-black text-sm uppercase tracking-widest text-primary gap-8">
            {[...Array(6)].map((_, i) => (
              <span key={i} className="flex items-center gap-6">
                <span>★ 0-100 Deterministic Scoring</span>
                <span className="text-white">·</span>
                <span>Gemini Flash Lite Hiring Verdict</span>
                <span className="text-white">·</span>
                <span>Embeddable SVG Badges</span>
                <span className="text-white">·</span>
                <span>30-Day Growth Roadmap</span>
                <span className="text-white">·</span>
                <span>Recruiter Interview Simulator</span>
                <span className="text-white">·</span>
              </span>
            ))}
          </div>
        </div>

        {/* ── 3. PLATFORM BENTO GRID SHOWCASE ── */}
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
                    Gemini evaluates your raw numbers and gives an honest hiring recommendation:
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

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {["Full-Stack", "Backend & Go", "AI & PyTorch", "Frontend UI", "DevOps & Cloud", "Open Source"].map((role) => (
                      <span key={role} className="border border-black px-2 py-0.5 text-[10px] font-black uppercase bg-gray-100">
                        {role}
                      </span>
                    ))}
                  </div>

                  <div className="border-2 border-black p-3 bg-gray-50 text-xs font-semibold space-y-1.5">
                    <div className="flex items-center gap-2 text-green-700">
                      <span>✓</span> Week 1: Quick Wins & README polish
                    </div>
                    <div className="flex items-center gap-2 text-primary">
                      <span>✓</span> Week 2: Architectural Depth & Tests
                    </div>
                    <div className="flex items-center gap-2 text-blue-600">
                      <span>✓</span> Week 3: Domain Specialization
                    </div>
                    <div className="flex items-center gap-2 text-purple-600">
                      <span>✓</span> Week 4: Industry Visibility & Live Demos
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t-2 border-black flex items-center justify-between text-xs font-bold">
                  <span>Persistent Checklists</span>
                  <span className="text-green-600 font-black">Progress Saved ✓</span>
                </div>
              </div>

              {/* Bento 4: Embeddable README Badges (4 cols) */}
              <div
                className="bento-card md:col-span-4 border-4 border-black bg-white p-7 shadow-[6px_6px_0_#000] flex flex-col justify-between"
                onMouseEnter={cardHover.onMouseEnter}
                onMouseLeave={cardHover.onMouseLeave}
              >
                <div>
                  <div className="flex items-center gap-2 border-b-2 border-black pb-3 mb-4">
                    <Award className="w-5 h-5 text-primary" />
                    <h3 className="font-heading font-black uppercase text-xl">Embeddable README Badges</h3>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium mb-4">
                    Show off your verified rating directly on your GitHub profile with dynamic SVG badges:
                  </p>

                  <div className="bg-zinc-900 border-2 border-black p-3 text-white text-center">
                    <div className="border border-zinc-700 p-2 bg-black/60 inline-block">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white">DEVSCOPE AI</span>
                        <span className="text-[10px] bg-green-400 text-black px-1.5 py-0.5 font-black">
                          88/100 ★
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="font-mono text-[10px] text-muted-foreground break-all mt-3 bg-gray-50 p-2 border border-black">
                    <code>{`[![DevScope Rating](.../api/badge/:user.svg)]`}</code>
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t-2 border-black flex items-center justify-between text-xs font-bold">
                  <span>Auto-updated live</span>
                  <span className="text-primary font-black">1-Click Copy</span>
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
                    <h3 className="font-heading font-black uppercase text-xl">Profile Battle</h3>
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

        {/* ── 4. HOW IT WORKS (3 SIMPLE STEPS) ── */}
        <section className="scroll-reveal w-full py-20 px-4 sm:px-6 border-t-4 border-b-4 border-black bg-black text-white">
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
                  desc: "Deterministic formulas score repository quality, activity recency, and diversity while Gemini Flash Lite delivers recruiter insights.",
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

        {/* ── 5. BOTTOM HIGH-ENERGY CTA SECTION ── */}
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
