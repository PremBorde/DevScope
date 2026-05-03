import { Suspense, lazy, useEffect, useState } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navbar from "@/components/layout/Navbar";
import WalkingLoader from "@/components/WalkingLoader";
import HomeGreeter from "@/components/HomeGreeter";
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

const ROUTE_MESSAGES: { match: RegExp; msg: string }[] = [
  { match: /^\/$/, msg: "Hello! Welcome 👋" },
  { match: /^\/analyze\//, msg: "Let's score! 🎯" },
  { match: /^\/dashboard\/history/, msg: "History time! 🕐" },
  { match: /^\/dashboard/, msg: "Your stats! 📊" },
  { match: /^\/compare/, msg: "Side by side! ⚖️" },
  { match: /^\/report\//, msg: "Report ready! 📋" },
];

const PAGE_TIPS: { match: RegExp; msg: string }[] = [
  { match: /^\/$/, msg: "Type a GitHub username! 🔍" },
  { match: /^\/analyze\//, msg: "Scroll for AI insights! 🤖" },
  { match: /^\/dashboard/, msg: "Click a row to revisit! 📊" },
  { match: /^\/compare/, msg: "Enter two usernames! ⚖️" },
];

function getRouteMessage(path: string) {
  for (const { match, msg } of ROUTE_MESSAGES) {
    if (match.test(path)) return msg;
  }
  return "Hey there! 👋";
}

function getPageTip(path: string) {
  for (const { match, msg } of PAGE_TIPS) {
    if (match.test(path)) return msg;
  }
  return "Explore DevScope! 🚀";
}

interface NavGreeter { msg: string; speed: "walk" | "run"; ts: number; }
interface ScoreGreeter { score: number; ts: number; }

function Router() {
  const [location] = useLocation();

  const [navGreeter,   setNavGreeter]   = useState<NavGreeter | null>(null);
  const [scoreGreeter, setScoreGreeter] = useState<ScoreGreeter | null>(null);

  /* ── Navigate: compute speed + easter-egg + run mode ──────────────── */
  useEffect(() => {
    const prevTime = parseInt(sessionStorage.getItem("ds_lastnav") || "0");
    const now      = Date.now();
    const elapsed  = now - prevTime;
    sessionStorage.setItem("ds_lastnav", String(now));

    const visits = parseInt(sessionStorage.getItem("ds_visits") || "0") + 1;
    sessionStorage.setItem("ds_visits", String(visits));

    const speed: "walk" | "run" = prevTime > 0 && elapsed < 2000 ? "run" : "walk";
    const isEgg = visits >= 5 && visits % 5 === 0;
    const msg   = isEgg ? "You're really exploring! 🗺️" : getRouteMessage(location);

    setNavGreeter({ msg, speed, ts: now });
  }, [location]);

  /* ── Subscribe to greeterBus (score events from analyze page) ──────── */
  useEffect(() => {
    return greeterBus.on((e) => {
      if (e.type === "score") {
        setScoreGreeter({ score: e.score, ts: Date.now() });
      }
      if (e.type === "tip") {
        setNavGreeter({ msg: e.msg, speed: "walk", ts: Date.now() });
      }
    });
  }, []);

  /* ── Keyboard shortcut: ? shows a context tip ──────────────────────── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key !== "?") return;
      setNavGreeter({ msg: getPageTip(location), speed: "walk", ts: Date.now() });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [location]);

  return (
    <div className="min-h-screen flex flex-col w-full bg-background selection:bg-primary selection:text-primary-foreground">
      <Navbar />

      {/* Nav greeter — walks in from the LEFT on every page change */}
      {navGreeter && (
        <HomeGreeter
          key={navGreeter.ts}
          message={navGreeter.msg}
          speed={navGreeter.speed}
          side="left"
        />
      )}

      {/* Score greeter — walks in from the RIGHT after analysis loads */}
      {scoreGreeter && (
        <HomeGreeter
          key={`score-${scoreGreeter.ts}`}
          scoreReaction={scoreGreeter.score}
          side="right"
          onDone={() => setScoreGreeter(null)}
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
