import React, { Suspense, useEffect } from "react";
import { useLocation } from "wouter";
import { Search, ArrowRight, Zap, Target, Brain, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Lazy load the 3D hero
const Hero3D = React.lazy(() => import("@/components/home/Hero3D"));

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Scroll reveals
    const sections = document.querySelectorAll(".reveal-section");
    sections.forEach((section) => {
      gsap.fromTo(
        section,
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: section,
            start: "top 80%",
          },
        }
      );
    });
  }, []);

  const handleAnalyze = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    if (username.trim()) {
      setLocation(`/analyze/${username.trim()}`);
    }
  };

  return (
    <div className="w-full flex flex-col min-h-screen overflow-hidden">
      {/* HERO SECTION */}
      <section className="relative w-full h-[90vh] flex flex-col items-center justify-center border-b-4 border-black overflow-hidden bg-background">
        <div className="absolute inset-0 z-0 opacity-80 mix-blend-multiply">
          <Suspense fallback={<div className="w-full h-full flex items-center justify-center font-heading font-bold text-2xl">LOADING 3D...</div>}>
            <Hero3D />
          </Suspense>
        </div>

        <motion.div 
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, staggerChildren: 0.2 }}
          className="relative z-10 w-full max-w-4xl mx-auto px-6 text-center flex flex-col items-center"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-6 inline-flex items-center gap-2 border-2 border-black bg-white px-4 py-1.5 shadow-[4px_4px_0_0_#000] transform -rotate-2"
          >
            <span className="w-3 h-3 bg-primary border border-black rounded-full animate-pulse" />
            <span className="font-bold text-sm uppercase tracking-wider">DevScope AI v1.0</span>
          </motion.div>

          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-6xl md:text-8xl font-heading font-black text-black leading-[0.9] tracking-tighter mb-6 uppercase drop-shadow-[4px_4px_0_rgba(255,141,63,1)]"
          >
            Analyze GitHub Like a Recruiter
          </motion.h1>
          
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-xl md:text-2xl font-medium text-black max-w-2xl mb-12"
          >
            Brutally honest scoring, AI insights, and hiring recommendations in seconds. Stop guessing. Start knowing.
          </motion.p>

          <motion.form 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            onSubmit={handleAnalyze} 
            className="flex flex-col sm:flex-row w-full max-w-xl gap-4 items-stretch"
          >
            <Input 
              name="username"
              placeholder="Enter GitHub Username..." 
              className="h-16 text-lg px-6 border-4 border-black rounded-none shadow-[6px_6px_0_0_#000] focus-visible:ring-0 focus-visible:shadow-[8px_8px_0_0_#000] transition-all bg-white flex-1"
              required
            />
            <Button 
              type="submit" 
              className="h-16 px-8 text-lg font-bold border-4 border-black rounded-none bg-primary text-black hover:bg-black hover:text-white shadow-[6px_6px_0_0_#000] hover:shadow-[8px_8px_0_0_#000] hover:-translate-y-1 transition-all group uppercase"
            >
              Analyze
              <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.form>
        </motion.div>
      </section>

      {/* FEATURES SECTION */}
      <section className="reveal-section w-full py-32 px-6 bg-background">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-heading font-black uppercase mb-16 border-b-4 border-black pb-4 inline-block">The Arsenal</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Zap className="w-10 h-10" />}
              title="Instant Scoring"
              desc="We crunch repo quality, activity, and tech diversity to output a definitive 0-100 score."
              rotation="-1.5deg"
              color="bg-white"
            />
            <FeatureCard 
              icon={<Brain className="w-10 h-10" />}
              title="AI Insights"
              desc="Strengths, weaknesses, and a brutally honest summary written like a senior engineering manager."
              rotation="1.5deg"
              color="bg-primary"
              textColor="text-black"
            />
            <FeatureCard 
              icon={<Target className="w-10 h-10" />}
              title="Hiring Verdict"
              desc="Get a clear signal: Strong Hire, Hire, Consider, or Pass. No ambiguity."
              rotation="-1deg"
              color="bg-white"
            />
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="reveal-section w-full py-32 px-6 border-t-4 border-black bg-primary">
        <div className="max-w-4xl mx-auto text-center border-4 border-black bg-white p-12 shadow-[12px_12px_0_0_#000] transform rotate-1">
          <h2 className="text-5xl font-heading font-black uppercase mb-6">Ready to judge?</h2>
          <p className="text-xl mb-10 font-medium">Drop a username. We'll do the rest.</p>
          <form onSubmit={handleAnalyze} className="flex flex-col sm:flex-row w-full max-w-lg mx-auto gap-4 items-stretch">
            <Input 
              name="username"
              placeholder="torvalds" 
              className="h-14 text-lg border-2 border-black rounded-none shadow-[4px_4px_0_0_#000] focus-visible:ring-0 bg-background flex-1"
              required
            />
            <Button 
              type="submit" 
              className="h-14 px-8 text-lg font-bold border-2 border-black rounded-none bg-black text-white hover:bg-background hover:text-black shadow-[4px_4px_0_0_#000] transition-all uppercase"
            >
              Go <ChevronRight className="ml-1 w-5 h-5" />
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, desc, rotation, color, textColor = "text-black" }: any) {
  return (
    <div 
      className={`p-8 border-4 border-black shadow-[8px_8px_0_0_#000] transition-transform hover:-translate-y-2 hover:shadow-[12px_12px_0_0_#000] ${color} ${textColor}`}
      style={{ transform: `rotate(${rotation})` }}
    >
      <div className="mb-6 p-4 border-2 border-black inline-block bg-background text-black shadow-[4px_4px_0_0_#000]">
        {icon}
      </div>
      <h3 className="text-2xl font-heading font-bold uppercase mb-4">{title}</h3>
      <p className="text-lg font-medium">{desc}</p>
    </div>
  );
}
