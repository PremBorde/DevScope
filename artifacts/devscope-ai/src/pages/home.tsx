import React, { Suspense, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Search, ArrowRight, Zap, Target, Brain, ChevronRight, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useScrollReveal, useStaggerEntrance, useCardHover } from "@/hooks/useAnimations";
import PageTransition from "@/components/layout/PageTransition";
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";

const Hero3D = React.lazy(() => import("@/components/home/Hero3D"));

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
  const [, setLocation] = useLocation();
  const { user, oauthEnabled, login } = useAuth();
  const pageRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);

  // Pre-fill input with logged-in user's username
  const [username, setUsername] = useState("");
  useEffect(() => {
    if (user?.username) setUsername(user.username);
  }, [user?.username]);

  usePageTitle("Analyze GitHub Like a Recruiter");
  useScrollReveal(pageRef, ".reveal");
  useStaggerEntrance(featuresRef, ".feature-card", { delay: 0.1, stagger: 0.12 });

  const handleAnalyze = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const val = username.trim();
    if (val) setLocation(`/analyze/${val}`);
  };

  const handleAnalyzeMyProfile = () => {
    if (user?.username) setLocation(`/analyze/${user.username}`);
  };

  return (
    <PageTransition>
      <div ref={pageRef} className="w-full flex flex-col min-h-screen overflow-hidden">
        {/* HERO SECTION */}
        <section className="relative w-full h-[100vh] min-h-[680px] flex flex-col items-center justify-center border-b-4 border-black overflow-hidden bg-background">
          <div className="absolute inset-0 z-0">
            <Suspense fallback={<div className="w-full h-full bg-background" />}>
              <Hero3D />
            </Suspense>
          </div>

          <div className="absolute inset-0 z-0 bg-background/30" />

          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-4xl mx-auto px-6 text-center flex flex-col items-center gap-8"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.5, ease: "backOut" }}
              className="inline-flex items-center gap-2 border-2 border-black bg-white px-5 py-2 shadow-[4px_4px_0_0_#000] -rotate-2"
            >
              <span className="w-3 h-3 bg-primary border border-black rounded-full animate-pulse" />
              <span className="font-bold text-sm uppercase tracking-wider">DevScope AI v1.0</span>
            </motion.div>

            <motion.h1
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="text-5xl md:text-7xl lg:text-8xl font-heading font-black text-black leading-[0.9] tracking-tighter uppercase drop-shadow-[5px_5px_0_rgba(255,141,63,1)]"
            >
              Analyze GitHub<br />Like a Recruiter
            </motion.h1>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.38, duration: 0.55 }}
              className="text-lg md:text-2xl font-semibold text-black max-w-xl leading-relaxed"
            >
              Brutally honest scoring, AI insights, and hiring recommendations in seconds.{" "}
              <span className="underline decoration-primary decoration-4 underline-offset-4">Stop guessing.</span>{" "}
              Start knowing.
            </motion.p>

            {/* Search form — username pre-filled if logged in */}
            <motion.form
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.55 }}
              onSubmit={handleAnalyze}
              className="flex flex-col sm:flex-row w-full max-w-2xl gap-3 items-stretch"
            >
              <Input
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter GitHub Username…"
                className="h-16 text-lg px-6 border-4 border-black rounded-none shadow-[6px_6px_0_0_#000] focus-visible:ring-0 focus-visible:shadow-[8px_8px_0_0_#000] transition-all bg-white flex-1 font-medium"
                required
              />
              <Button
                type="submit"
                className="h-16 px-10 text-lg font-bold border-4 border-black rounded-none bg-primary text-black hover:bg-black hover:text-white shadow-[6px_6px_0_0_#000] hover:shadow-[8px_8px_0_0_#000] hover:-translate-y-1 transition-all group uppercase tracking-wide flex-shrink-0"
              >
                Analyze
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.form>

            {/* CTA row: login or analyze my profile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.65 }}
              className="flex flex-col sm:flex-row items-center gap-4"
            >
              {user ? (
                /* Logged in — quick shortcut */
                <Button
                  onClick={handleAnalyzeMyProfile}
                  className="h-12 px-8 text-base font-bold border-2 border-black rounded-none bg-black text-white hover:bg-primary hover:text-black shadow-[4px_4px_0_0_#FF8D3F] hover:-translate-y-0.5 transition-all flex items-center gap-2 uppercase tracking-wide"
                >
                  <img
                    src={user.avatarUrl}
                    alt={user.username}
                    className="w-5 h-5 border border-white/50 rounded-none"
                  />
                  Analyze My Profile (@{user.username})
                </Button>
              ) : oauthEnabled ? (
                /* Not logged in — offer login */
                <Button
                  onClick={login}
                  variant="outline"
                  className="h-12 px-8 text-base font-bold border-2 border-black rounded-none bg-white text-black hover:bg-black hover:text-white shadow-[4px_4px_0_0_#000] hover:-translate-y-0.5 transition-all flex items-center gap-2 uppercase tracking-wide"
                >
                  <Github className="w-5 h-5" />
                  Login to auto-fill your username
                </Button>
              ) : null}

              <div className="flex items-center gap-5 text-sm font-bold uppercase tracking-wide text-black/60">
                <span>✓ Free to use</span>
                <span className="w-1.5 h-1.5 bg-black rounded-full" />
                <span>✓ No account needed</span>
                <span className="w-1.5 h-1.5 bg-black rounded-full" />
                <span>✓ AI-powered</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
            className="absolute bottom-8 z-10 flex flex-col items-center gap-1"
          >
            <span className="text-xs font-bold uppercase tracking-widest text-black/40">Scroll</span>
            <div className="w-px h-8 bg-black/20" />
          </motion.div>
        </section>

        {/* FEATURES SECTION */}
        <section ref={featuresRef} className="reveal w-full py-28 px-6 bg-background">
          <div className="max-w-7xl mx-auto">
            <div className="reveal mb-20">
              <span className="text-xs font-black uppercase tracking-widest text-primary border-b-2 border-primary pb-1">The Arsenal</span>
              <h2 className="text-5xl md:text-7xl font-heading font-black uppercase mt-3 leading-none">
                Three tools.<br />One verdict.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <FeatureCard
                index={0}
                icon={<Zap className="w-10 h-10" />}
                title="Instant Scoring"
                desc="We crunch repo quality, activity, and tech diversity to output a definitive 0-100 score. No fluff."
                rotation="-1.5deg"
                color="bg-white"
              />
              <FeatureCard
                index={1}
                icon={<Brain className="w-10 h-10" />}
                title="AI Insights"
                desc="Strengths, weaknesses, and a brutally honest summary written like a senior engineering manager."
                rotation="1.5deg"
                color="bg-primary"
                textColor="text-black"
              />
              <FeatureCard
                index={2}
                icon={<Target className="w-10 h-10" />}
                title="Hiring Verdict"
                desc="Get a clear signal: Strong Hire, Hire, Consider, or Pass. No ambiguity. No excuses."
                rotation="-1deg"
                color="bg-white"
              />
            </div>
          </div>
        </section>

        {/* STATS SECTION */}
        <section className="reveal w-full py-20 px-6 border-t-4 border-b-4 border-black bg-black text-white">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[
              { num: "5",  label: "Scoring categories" },
              { num: "100", label: "Point scale" },
              { num: "AI", label: "Powered insights" },
            ].map(({ num, label }) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <span className="text-7xl font-heading font-black text-primary">{num}</span>
                <span className="font-bold uppercase tracking-widest text-sm text-white/60">{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* CTA SECTION */}
        <section className="reveal w-full py-28 px-6 bg-primary">
          <div className="max-w-4xl mx-auto text-center border-4 border-black bg-white p-14 shadow-[14px_14px_0_0_#000] rotate-1">
            <h2 className="text-5xl md:text-6xl font-heading font-black uppercase mb-4 leading-none">Ready to judge?</h2>
            <p className="text-xl mb-10 font-semibold text-black/70">Drop a username. We'll do the rest.</p>
            <form onSubmit={handleAnalyze} className="flex flex-col sm:flex-row w-full max-w-lg mx-auto gap-3 items-stretch">
              <Input
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. torvalds"
                className="h-14 text-lg border-2 border-black rounded-none shadow-[4px_4px_0_0_#000] focus-visible:ring-0 bg-background flex-1 font-medium"
                required
              />
              <Button
                type="submit"
                className="h-14 px-8 text-lg font-bold border-2 border-black rounded-none bg-black text-white hover:bg-background hover:text-black shadow-[4px_4px_0_0_#000] transition-all uppercase tracking-wide flex-shrink-0"
              >
                Go <ChevronRight className="ml-1 w-5 h-5" />
              </Button>
            </form>
          </div>
        </section>
      </div>
    </PageTransition>
  );
}

function FeatureCard({
  icon, title, desc, rotation, color, textColor = "text-black",
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  rotation: string;
  color: string;
  textColor?: string;
  index: number;
}) {
  const hover = useCardHover();
  return (
    <div
      className={`feature-card p-10 border-4 border-black shadow-[8px_8px_0_0_#000] cursor-pointer will-change-transform ${color} ${textColor}`}
      style={{ transform: `rotate(${rotation})` }}
      onMouseEnter={hover.onMouseEnter}
      onMouseLeave={hover.onMouseLeave}
    >
      <div className="mb-8 p-4 border-2 border-black inline-block bg-background text-black shadow-[4px_4px_0_0_#000]">
        {icon}
      </div>
      <h3 className="text-2xl font-heading font-bold uppercase mb-4">{title}</h3>
      <p className="text-lg font-medium leading-relaxed">{desc}</p>
    </div>
  );
}
