import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navbar from "@/components/layout/Navbar";
import WalkingLoader from "@/components/WalkingLoader";
import HomeGreeter, { type HatType } from "@/components/HomeGreeter";
import { greeterBus } from "@/lib/greeterBus";

const Home      = lazy(() => import("@/pages/home"));
const Analyze   = lazy(() => import("@/pages/analyze"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const History   = lazy(() => import("@/pages/history"));
const Report     = lazy(() => import("@/pages/report"));
const ReportView = lazy(() => import("@/pages/report-view"));
const Compare    = lazy(() => import("@/pages/compare"));
const NotFound   = lazy(() => import("@/pages/not-found"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

/* ── Route messages ──────────────────────────────────────── */
function getTimeOfDayGreeting(): string {
  const h = new Date().getHours();
  if (h < 6)  return "Late night coding? 🦉";
  if (h < 12) return "Good morning! ☀️";
  if (h < 17) return "Good afternoon! 🌤️";
  if (h < 21) return "Good evening! 🌆";
  return "Burning midnight oil? 🔥";
}

const ROUTE_MESSAGES: { match: RegExp; msg: string }[] = [
  { match: /^\/analyze\//,        msg: "Let's score! 🎯"    },
  { match: /^\/dashboard\/history/, msg: "History time! 🕐" },
  { match: /^\/dashboard/,        msg: "Your stats! 📊"    },
  { match: /^\/compare/,          msg: "Side by side! ⚖️"  },
  { match: /^\/report\//,         msg: "Report ready! 📋"  },
];

const PAGE_TIPS: { match: RegExp; msg: string }[] = [
  { match: /^\/$/, msg: "Type a GitHub username! 🔍" },
  { match: /^\/analyze\//, msg: "Scroll for AI insights! 🤖" },
  { match: /^\/dashboard/, msg: "Click a row to revisit! 📊" },
  { match: /^\/compare/, msg: "Enter two usernames! ⚖️" },
];

function getRouteMessage(path: string): string {
  if (path === "/") return getTimeOfDayGreeting();
  for (const { match, msg } of ROUTE_MESSAGES) {
    if (match.test(path)) return msg;
  }
  return "Hey there! 👋";
}

function getPageTip(path: string): string {
  for (const { match, msg } of PAGE_TIPS) {
    if (match.test(path)) return msg;
  }
  return "Explore DevScope! 🚀";
}

/* ── Mood memory ─────────────────────────────────────────── */
function getMoodMessage(recentScores: number[]): string | null {
  if (recentScores.length < 3) return null;
  if (recentScores.every((s) => s >= 70)) return "On a roll! 🔥";
  if (recentScores.every((s) => s < 50))  return "Tough crowd… 😮‍💨";
  return null;
}

/* ── State shapes ────────────────────────────────────────── */
interface NavGreeter     { msg: string; speed: "walk" | "run"; hat: HatType; ts: number; }
interface ScoreGreeter   { score: number; msg: string; hat: HatType; confetti: boolean; ts: number; }
interface EventGreeter   { msg: string; quick: boolean; side: "left" | "right"; hat?: HatType; ts: number; }
interface WatcherGreeter { ts: number; msg: string; shouldExit: boolean; }

/* ── Router ──────────────────────────────────────────────── */
function Router() {
  const [location] = useLocation();

  const [navGreeter,     setNavGreeter]     = useState<NavGreeter | null>(null);
  const [scoreGreeter,   setScoreGreeter]   = useState<ScoreGreeter | null>(null);
  const [eventGreeter,   setEventGreeter]   = useState<EventGreeter | null>(null);
  const [watcherGreeter, setWatcherGreeter] = useState<WatcherGreeter | null>(null);

  /* ── Navigation: speed, easter-egg, time-of-day, hat ─── */
  useEffect(() => {
    const prevTime = parseInt(sessionStorage.getItem("ds_lastnav") || "0");
    const now      = Date.now();
    sessionStorage.setItem("ds_lastnav", String(now));

    const visits = parseInt(sessionStorage.getItem("ds_visits") || "0") + 1;
    sessionStorage.setItem("ds_visits", String(visits));

    const speed: "walk" | "run" = prevTime > 0 && (now - prevTime) < 2000 ? "run" : "walk";
    const isEgg = visits >= 5 && visits % 5 === 0;

    const baseMsg = getRouteMessage(location);
    const msg     = isEgg ? "You're really exploring! 🗺️" : baseMsg;

    const hat: HatType =
      isEgg                           ? "party" :
      location.startsWith("/analyze/") ? "hard"  :
      null;

    setNavGreeter({ msg, speed, hat, ts: now });
  }, [location]);

  /* ── AFK detector — 3-minute idle ───────────────────── */
  useEffect(() => {
    let lastActivity = Date.now();
    let afkShown     = false;

    const onActivity = () => { lastActivity = Date.now(); afkShown = false; };
    window.addEventListener("mousemove", onActivity, { passive: true });
    window.addEventListener("keydown",   onActivity, { passive: true });
    window.addEventListener("click",     onActivity, { passive: true });

    const interval = setInterval(() => {
      if (!afkShown && Date.now() - lastActivity > 3 * 60 * 1000) {
        afkShown = true;
        setNavGreeter({ msg: "Still there? 👀", speed: "walk", hat: "sleep", ts: Date.now() });
      }
    }, 30_000);

    return () => {
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("keydown",   onActivity);
      window.removeEventListener("click",     onActivity);
      clearInterval(interval);
    };
  }, []);

  /* ── Keyboard shortcut: ? shows context tip ─────────── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key !== "?") return;
      setNavGreeter({ msg: getPageTip(location), speed: "walk", hat: null, ts: Date.now() });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [location]);

  /* ── greeterBus subscriptions ────────────────────────── */
  useEffect(() => {
    return greeterBus.on((e) => {
      if (e.type === "tip") {
        setNavGreeter({ msg: e.msg, speed: "walk", hat: null, ts: Date.now() });
        return;
      }

      if (e.type === "watching") {
        setWatcherGreeter({ ts: Date.now(), msg: "I'm watching! 👀", shouldExit: false });
        return;
      }

      if (e.type === "typing") {
        const msg = e.value ? `@${e.value.slice(0, 14)} 💻` : "I'm watching! 👀";
        setWatcherGreeter((prev) => prev ? { ...prev, msg } : null);
        return;
      }

      if (e.type === "inputBlur") {
        const farewell = e.value.trim()
          ? `Go get @${e.value.trim().slice(0, 12)}! 🚀`
          : "Good luck! 🤞";
        setWatcherGreeter((prev) =>
          prev ? { ...prev, msg: farewell, shouldExit: true } : null,
        );
        return;
      }

      if (e.type === "error") {
        setNavGreeter({
          msg: e.msg ?? "Hmm, that didn't work! 🤔",
          speed: "walk",
          hat: null,
          ts: Date.now(),
        });
        return;
      }

      if (e.type === "celebrate") {
        setEventGreeter({ msg: e.msg, quick: true, side: "right", ts: Date.now() });
        return;
      }

      if (e.type === "score") {
        /* Mood memory */
        const prev: number[] = JSON.parse(sessionStorage.getItem("ds_scores") || "[]");
        const recent = [...prev, e.score].slice(-3);
        sessionStorage.setItem("ds_scores", JSON.stringify(recent));

        const moodMsg = getMoodMessage(recent);
        const baseScoreMsg =
          e.score >= 80 ? "Rockstar dev! 🌟" :
          e.score >= 60 ? "Solid skills! 💪" :
          e.score >= 40 ? "Room to grow! 📈" :
          "We'll get there! 😅";
        const msg = moodMsg ?? baseScoreMsg;

        const hat: HatType =
          e.score >= 90 ? "party" :
          e.score >= 80 ? "grad"  :
          e.score < 40  ? "sleep" :
          null;

        setScoreGreeter({
          score:    e.score,
          msg,
          hat,
          confetti: e.score >= 90,
          ts:       Date.now(),
        });
      }
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col w-full bg-background selection:bg-primary selection:text-primary-foreground">
      <Navbar />

      {/* Nav greeter — LEFT side, every page nav */}
      {navGreeter && (
        <HomeGreeter
          key={navGreeter.ts}
          message={navGreeter.msg}
          speed={navGreeter.speed}
          hat={navGreeter.hat}
          side="left"
        />
      )}

      {/* Score greeter — RIGHT side, after analysis loads */}
      {scoreGreeter && (
        <HomeGreeter
          key={`score-${scoreGreeter.ts}`}
          message={scoreGreeter.msg}
          scoreReaction={scoreGreeter.score}
          hat={scoreGreeter.hat}
          confetti={scoreGreeter.confetti}
          side="right"
          onDone={() => setScoreGreeter(null)}
        />
      )}

      {/* Event greeter — celebrate / error */}
      {eventGreeter && (
        <HomeGreeter
          key={`evt-${eventGreeter.ts}`}
          message={eventGreeter.msg}
          hat={eventGreeter.hat ?? null}
          quick={eventGreeter.quick}
          side={eventGreeter.side}
          onDone={() => setEventGreeter(null)}
        />
      )}

      {/* Watcher greeter — persistent while user is typing in the input */}
      {watcherGreeter && (
        <HomeGreeter
          key={`watch-${watcherGreeter.ts}`}
          message={watcherGreeter.msg}
          persistent={true}
          shouldExit={watcherGreeter.shouldExit}
          side="right"
          onDone={() => setWatcherGreeter(null)}
        />
      )}

      <main className="flex-1 flex flex-col w-full">
        <Suspense fallback={<WalkingLoader />}>
          <Switch>
            <Route path="/"                          component={Home}      />
            <Route path="/analyze/:username"         component={Analyze}   />
            <Route path="/dashboard"                 component={Dashboard} />
            <Route path="/dashboard/history"         component={History}   />
            <Route path="/report/view/:id"           component={ReportView} />
            <Route path="/report/:username"          component={Report}    />
            <Route path="/compare"                   component={Compare}   />
            <Route                                   component={NotFound}  />
          </Switch>
        </Suspense>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
