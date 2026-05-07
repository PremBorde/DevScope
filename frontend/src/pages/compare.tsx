import React, { useState, useEffect, useRef } from "react";
import { useSearch, useLocation } from "wouter";
import {
  useCompareGithubProfiles,
  getCompareGithubProfilesQueryKey,
} from "@workspace/api-client-react";
import type { CompareResult } from "@workspace/api-client-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useStaggerEntrance } from "@/hooks/useAnimations";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowRight, ArrowLeftRight, Trophy, MapPin, Users,
  Star, GitFork, ExternalLink, RefreshCw,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import PageTransition from "@/components/layout/PageTransition";

// ─── Hiring badge ────────────────────────────────────────────────────────────
function HiringBadge({ rec }: { rec: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    strong_hire: { label: "Strong Hire", cls: "bg-green-400" },
    hire:        { label: "Hire",        cls: "bg-blue-400" },
    consider:    { label: "Consider",    cls: "bg-yellow-300" },
    pass:        { label: "Pass",        cls: "bg-red-400" },
  };
  const s = map[rec] ?? map["consider"];
  return (
    <span className={`inline-block px-2.5 py-0.5 border-2 border-black font-black uppercase text-black text-[10px] shadow-[2px_2px_0_#000] ${s.cls}`}>
      {s.label}
    </span>
  );
}

// ─── Score badge ─────────────────────────────────────────────────────────────
function ScoreBadge({ score, winner }: { score: number; winner: boolean }) {
  const color =
    winner ? "text-green-600" : score >= 70 ? "text-blue-600" : score >= 50 ? "text-yellow-600" : "text-red-500";
  return (
    <div className={`text-center border-4 border-black px-5 py-3 shadow-[4px_4px_0_#000] bg-white ${winner ? "shadow-[4px_4px_0_#22c55e]" : ""}`}>
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Score</p>
      <p className={`font-heading font-black text-5xl leading-none ${color}`}>{score}</p>
      <p className="text-xs font-bold text-muted-foreground mt-0.5">/100</p>
      {winner && (
        <p className="mt-1.5 text-[10px] font-black uppercase tracking-widest text-green-600">
          🏆 Winner
        </p>
      )}
    </div>
  );
}

// ─── Profile card ────────────────────────────────────────────────────────────
function ProfileCard({
  side,
  data,
  winner,
}: {
  side: "left" | "right";
  data: CompareResult["user1"];
  winner: boolean;
}) {
  const tilt = side === "left" ? "-rotate-[0.8deg]" : "rotate-[0.8deg]";
  const shadow = winner
    ? "shadow-[8px_8px_0_#22c55e]"
    : "shadow-[8px_8px_0_#000]";

  return (
    <div
      className={`border-4 border-black bg-white p-5 transition-transform duration-150 hover:-translate-y-1 ${tilt} ${shadow}`}
    >
      {/* Avatar + name */}
      <div className="flex items-start gap-4 mb-4">
        <img
          src={data.profile.avatar_url}
          alt={data.username}
          className="w-16 h-16 border-4 border-black shadow-[3px_3px_0_#000] flex-shrink-0 object-cover"
        />
        <div className="min-w-0 flex-1">
          <h3 className="font-heading font-black text-xl leading-tight truncate">
            {data.profile.name ?? data.username}
          </h3>
          <a
            href={data.profile.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-muted-foreground font-medium hover:text-foreground transition-colors"
          >
            @{data.username}
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
          </a>
          {data.profile.location && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              {data.profile.location}
            </p>
          )}
          <div className="mt-2">
            <HiringBadge rec={data.aiInsights.hiringRecommendation} />
          </div>
        </div>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-3 gap-2 border-t-2 border-black pt-3">
        {[
          { icon: <GitFork className="w-3.5 h-3.5" />, val: data.repoStats.totalRepos, label: "Repos" },
          { icon: <Star className="w-3.5 h-3.5" />, val: data.repoStats.totalStars.toLocaleString(), label: "Stars" },
          { icon: <Users className="w-3.5 h-3.5" />, val: data.profile.followers.toLocaleString(), label: "Followers" },
        ].map(({ icon, val, label }) => (
          <div key={label} className="text-center">
            <div className="flex items-center justify-center gap-0.5 text-muted-foreground mb-0.5">{icon}</div>
            <p className="font-heading font-black text-base leading-none">{val}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Top languages */}
      {data.repoStats.topLanguages.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t-2 border-black">
          {data.repoStats.topLanguages.slice(0, 3).map((lang) => (
            <span key={lang} className="text-[10px] font-bold px-2 py-0.5 border-2 border-black bg-background uppercase tracking-wide shadow-[1px_1px_0_#000]">
              {lang}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Metric row ───────────────────────────────────────────────────────────────
function MetricRow({
  label,
  aVal,
  bVal,
  max,
  categoryWinner,
  bold,
}: {
  label: string;
  aVal: number;
  bVal: number;
  max?: number;
  categoryWinner: "user1" | "user2" | "tie";
  bold?: boolean;
}) {
  const aWins = categoryWinner === "user1";
  const bWins = categoryWinner === "user2";
  const suffix = max ? `/${max}` : "";

  return (
    <div className="grid grid-cols-[1fr_130px_1fr] border-b-2 border-black last:border-b-0">
      {/* Left — user1 */}
      <div className={`flex items-center justify-end gap-2 px-4 md:px-6 py-4 ${aWins ? "bg-green-50" : bWins ? "bg-red-50/60" : ""}`}>
        {aWins && <span className="text-green-500 font-black text-base leading-none select-none">✓</span>}
        {bWins && <span className="text-red-400 font-black text-sm leading-none select-none">✗</span>}
        <span className={`font-heading font-black ${bold ? "text-4xl md:text-5xl" : "text-2xl"} tabular-nums ${aWins ? "text-green-600" : bWins ? "text-red-500" : "text-foreground"}`}>
          {aVal.toLocaleString()}{suffix}
        </span>
      </div>

      {/* Center label */}
      <div className="flex items-center justify-center px-2 py-4 bg-gray-50 border-x-2 border-black">
        <span className="font-bold text-[10px] md:text-xs uppercase tracking-wide text-center leading-tight text-muted-foreground">
          {label}
        </span>
      </div>

      {/* Right — user2 */}
      <div className={`flex items-center justify-start gap-2 px-4 md:px-6 py-4 ${bWins ? "bg-green-50" : aWins ? "bg-red-50/60" : ""}`}>
        <span className={`font-heading font-black ${bold ? "text-4xl md:text-5xl" : "text-2xl"} tabular-nums ${bWins ? "text-green-600" : aWins ? "text-red-500" : "text-foreground"}`}>
          {bVal.toLocaleString()}{suffix}
        </span>
        {bWins && <span className="text-green-500 font-black text-base leading-none select-none">✓</span>}
        {aWins && <span className="text-red-400 font-black text-sm leading-none select-none">✗</span>}
      </div>
    </div>
  );
}

// ─── Raw stat row (totalRepos, totalStars — not in categoryWinners) ───────────
function StatRow({ label, aVal, bVal }: { label: string; aVal: number; bVal: number }) {
  const winner = aVal > bVal ? "user1" : bVal > aVal ? "user2" : "tie";
  return (
    <MetricRow
      label={label}
      aVal={aVal}
      bVal={bVal}
      categoryWinner={winner}
    />
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function CompareSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-10 space-y-8">
      <div className="flex items-center gap-3 text-muted-foreground">
        <RefreshCw className="w-5 h-5 animate-spin" />
        <span className="font-bold text-sm uppercase tracking-wide">Analyzing both profiles…</span>
      </div>
      <div className="grid grid-cols-2 gap-5">
        {[0, 1].map((i) => (
          <div key={i} className="border-4 border-black bg-white p-5 space-y-3 shadow-[8px_8px_0_#000]">
            <div className="flex items-center gap-4">
              <Skeleton className="w-16 h-16 rounded-none border-2 border-black flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-32 rounded-none border border-black" />
                <Skeleton className="h-4 w-20 rounded-none border border-black" />
                <Skeleton className="h-5 w-24 rounded-none border border-black" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-3 border-t-2 border-black">
              {[0, 1, 2].map((j) => (
                <Skeleton key={j} className="h-10 rounded-none border border-black" />
              ))}
            </div>
          </div>
        ))}
      </div>
      <Skeleton className="h-72 rounded-none border-4 border-black shadow-[8px_8px_0_#000]" />
      <Skeleton className="h-36 rounded-none border-4 border-black shadow-[8px_8px_0_#FF8D3F]" />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Compare() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const searchParams = new URLSearchParams(search);
  const user1 = searchParams.get("user1") ?? "";
  const user2 = searchParams.get("user2") ?? "";

  const [inputA, setInputA] = useState(user1);
  const [inputB, setInputB] = useState(user2);

  const resultsRef = useRef<HTMLDivElement>(null);
  const cardsRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputA(user1);
    setInputB(user2);
  }, [user1, user2]);

  usePageTitle(user1 && user2 ? `${user1} vs ${user2}` : "Compare Profiles");

  useStaggerEntrance(cardsRef, ".compare-card", { stagger: 0.06, y: 20 });

  const { data, isLoading, error } = useCompareGithubProfiles(
    { user1, user2 },
    {
      query: {
        enabled: !!(user1 && user2),
        retry: false,
        queryKey: getCompareGithubProfilesQueryKey({ user1, user2 }),
      },
    }
  );

  const handleCompare = (e: React.FormEvent) => {
    e.preventDefault();
    const a = inputA.trim();
    const b = inputB.trim();
    if (!a || !b) return;
    if (a.toLowerCase() === b.toLowerCase()) {
      toast({ title: "Same username", description: "Enter two different GitHub usernames." });
      return;
    }
    setLocation(`/compare?user1=${encodeURIComponent(a)}&user2=${encodeURIComponent(b)}`);
  };

  const handleSwap = () => {
    if (user1 && user2) {
      setLocation(`/compare?user1=${encodeURIComponent(user2)}&user2=${encodeURIComponent(user1)}`);
    } else {
      const tmp = inputA;
      setInputA(inputB);
      setInputB(tmp);
    }
  };

  const winner = data?.comparison.winner;
  const u1Wins = winner === "user1";
  const u2Wins = winner === "user2";

  const errMsg = (error as { message?: string })?.message ?? "";
  const isNotFound  = errMsg.toLowerCase().includes("not found");
  const isRateLimit = errMsg.toLowerCase().includes("rate limit");

  return (
    <PageTransition>
      <div className="w-full min-h-screen bg-background">

        {/* ── Sticky header + form ───────────────────────────────────────── */}
        <div className="border-b-4 border-black bg-background px-4 md:px-6 py-7 sticky top-0 z-30">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Title */}
              <div className="flex-shrink-0">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary border-b-2 border-primary pb-0.5">
                  DevScope AI
                </span>
                <h1 className="font-heading font-black uppercase text-3xl md:text-4xl leading-none mt-1">
                  ⚔️ Compare
                </h1>
              </div>

              {/* Form */}
              <form onSubmit={handleCompare} className="flex flex-1 flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                <input
                  value={inputA}
                  onChange={(e) => setInputA(e.target.value)}
                  placeholder="Username 1…"
                  required
                  className="flex-1 h-12 px-4 border-4 border-black bg-white font-semibold text-sm shadow-[3px_3px_0_#000] focus:outline-none focus:shadow-[5px_5px_0_#000] transition-all placeholder:text-muted-foreground"
                />

                {/* Swap button */}
                <button
                  type="button"
                  onClick={handleSwap}
                  title="Swap users"
                  className="h-12 w-12 flex-shrink-0 border-4 border-black bg-white font-black shadow-[3px_3px_0_#000] hover:shadow-[5px_5px_0_#000] hover:-translate-y-0.5 transition-all flex items-center justify-center self-center"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </button>

                <input
                  value={inputB}
                  onChange={(e) => setInputB(e.target.value)}
                  placeholder="Username 2…"
                  required
                  className="flex-1 h-12 px-4 border-4 border-black bg-white font-semibold text-sm shadow-[3px_3px_0_#000] focus:outline-none focus:shadow-[5px_5px_0_#000] transition-all placeholder:text-muted-foreground"
                />

                <button
                  type="submit"
                  className="h-12 px-6 flex-shrink-0 border-4 border-black bg-primary font-black uppercase text-xs shadow-[3px_3px_0_#000] hover:shadow-[5px_5px_0_#000] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-1.5"
                >
                  Compare <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* ── Empty state ────────────────────────────────────────────────── */}
        {!user1 && !user2 && (
          <div className="max-w-5xl mx-auto px-4 md:px-6 py-20 text-center">
            <p className="text-5xl mb-5">⚔️</p>
            <p className="font-heading font-black text-3xl uppercase mb-3">Head-to-Head Analysis</p>
            <p className="text-muted-foreground font-medium text-base max-w-md mx-auto">
              Enter two GitHub usernames above. We'll score both profiles, compare every metric, and give you a definitive AI hiring verdict.
            </p>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
              {[
                { icon: "📊", title: "Metric-by-metric", desc: "Green ✓ / Red ✗ on every category" },
                { icon: "🤖", title: "AI Verdict", desc: "Gemini generates a brutally honest hiring decision" },
                { icon: "🔗", title: "Shareable URL", desc: "Bookmark or share the compare link" },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="border-2 border-black p-4 bg-white shadow-[3px_3px_0_#000]">
                  <p className="text-2xl mb-1">{icon}</p>
                  <p className="font-bold text-sm uppercase tracking-wide mb-1">{title}</p>
                  <p className="text-xs text-muted-foreground font-medium">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Loading ────────────────────────────────────────────────────── */}
        {isLoading && <CompareSkeleton />}

        {/* ── Error ─────────────────────────────────────────────────────── */}
        {error && !isLoading && (
          <div className="max-w-5xl mx-auto px-4 md:px-6 py-12">
            <div className={`border-4 border-black p-7 shadow-[8px_8px_0_#000] ${isNotFound ? "bg-yellow-50" : isRateLimit ? "bg-orange-50" : "bg-red-50"}`}>
              <p className="font-heading font-black text-2xl uppercase mb-2">
                {isNotFound ? "🔍 User Not Found" : isRateLimit ? "⏱ Rate Limited" : "⚠️ Something Went Wrong"}
              </p>
              <p className="font-medium text-sm text-muted-foreground mb-5">{errMsg}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setLocation("/compare")}
                  className="border-2 border-black bg-white px-5 py-2 font-bold text-sm uppercase shadow-[3px_3px_0_#000] hover:shadow-[5px_5px_0_#000] hover:-translate-y-0.5 transition-all"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Results ───────────────────────────────────────────────────── */}
        {data && !isLoading && (
          <div ref={resultsRef} className="max-w-5xl mx-auto px-4 md:px-6 py-8 space-y-8">

            {/* Profile cards */}
            <div ref={cardsRef} className="grid grid-cols-2 gap-5">
              <div className="compare-card space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="font-black text-xs uppercase tracking-widest text-muted-foreground">@{user1}</span>
                  {u1Wins && <span className="text-xs font-black uppercase text-green-600 tracking-wide">🏆 Winner</span>}
                </div>
                <ProfileCard side="left" data={data.user1} winner={u1Wins} />
                <ScoreBadge score={data.user1.scoreBreakdown.total} winner={u1Wins} />
              </div>
              <div className="compare-card space-y-3">
                <div className="flex items-center justify-between px-1">
                  {u2Wins && <span className="text-xs font-black uppercase text-green-600 tracking-wide">🏆 Winner</span>}
                  <span className="font-black text-xs uppercase tracking-widest text-muted-foreground ml-auto">@{user2}</span>
                </div>
                <ProfileCard side="right" data={data.user2} winner={u2Wins} />
                <ScoreBadge score={data.user2.scoreBreakdown.total} winner={u2Wins} />
              </div>
            </div>

            {/* Metric comparison table */}
            <div className="border-4 border-black bg-white shadow-[8px_8px_0_#000] overflow-hidden compare-card">
              {/* Column headers */}
              <div className="grid grid-cols-[1fr_130px_1fr] border-b-4 border-black bg-black">
                <div className="px-4 md:px-6 py-3 flex items-center justify-end">
                  <span className="font-black text-xs uppercase tracking-widest text-white/70">@{user1}</span>
                </div>
                <div className="flex items-center justify-center px-2 border-x-2 border-white/20">
                  <span className="font-black text-[10px] uppercase tracking-widest text-white/50">Metric</span>
                </div>
                <div className="px-4 md:px-6 py-3 flex items-center justify-start">
                  <span className="font-black text-xs uppercase tracking-widest text-white/70">@{user2}</span>
                </div>
              </div>

              {/* Overall score */}
              <MetricRow
                label="Overall Score"
                aVal={data.user1.scoreBreakdown.total}
                bVal={data.user2.scoreBreakdown.total}
                categoryWinner={winner ?? "tie"}
                bold
              />

              {/* Category scores */}
              {(
                [
                  { key: "repoQuality",         label: "Repo Quality",   max: 30 },
                  { key: "activityConsistency",  label: "Activity",       max: 25 },
                  { key: "techDiversity",        label: "Tech Diversity", max: 20 },
                  { key: "popularity",           label: "Popularity",     max: 15 },
                  { key: "completeness",         label: "Completeness",   max: 10 },
                ] as const
              ).map(({ key, label, max }) => (
                <MetricRow
                  key={key}
                  label={label}
                  aVal={data.user1.scoreBreakdown[key]}
                  bVal={data.user2.scoreBreakdown[key]}
                  max={max}
                  categoryWinner={data.comparison.categoryWinners[key]}
                />
              ))}

              {/* Raw stats */}
              <StatRow
                label="Public Repos"
                aVal={data.user1.repoStats.totalRepos}
                bVal={data.user2.repoStats.totalRepos}
              />
              <StatRow
                label="Total Stars"
                aVal={data.user1.repoStats.totalStars}
                bVal={data.user2.repoStats.totalStars}
              />
              <StatRow
                label="Total Forks"
                aVal={data.user1.repoStats.totalForks}
                bVal={data.user2.repoStats.totalForks}
              />
              <StatRow
                label="Followers"
                aVal={data.user1.profile.followers}
                bVal={data.user2.profile.followers}
              />
            </div>

            {/* Verdict card */}
            <div className="border-4 border-black bg-black text-white p-7 shadow-[8px_8px_0_0_#FF8D3F] compare-card">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 border-2 border-primary bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Trophy className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">
                    AI Hiring Verdict
                  </p>
                  <p className="font-heading font-black uppercase text-lg leading-snug mb-3">
                    {winner === "tie"
                      ? "It's a close call"
                      : `@${data.comparison.winnerUsername} is the stronger hire`}
                  </p>
                  <p className="font-medium text-sm leading-relaxed text-white/85">
                    {data.comparison.reason}
                  </p>
                  <div className="flex items-center gap-2 mt-4 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Score diff:</span>
                    <span className="text-xs font-bold text-white border border-white/20 px-2 py-0.5">
                      {data.comparison.scoreDiff} pts
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI summaries */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 compare-card">
              {(
                [
                  { username: user1, profile: data.user1, wins: u1Wins },
                  { username: user2, profile: data.user2, wins: u2Wins },
                ] as const
              ).map(({ username, profile, wins }) => (
                <div
                  key={username}
                  className={`border-4 border-black bg-white p-5 shadow-[6px_6px_0_#000] ${wins ? "border-green-500" : ""}`}
                >
                  <div className="flex items-center justify-between mb-3 pb-3 border-b-2 border-black">
                    <span className="font-black text-xs uppercase tracking-widest text-muted-foreground">@{username}</span>
                    <HiringBadge rec={profile.aiInsights.hiringRecommendation} />
                  </div>
                  <p className="font-medium text-sm leading-relaxed text-muted-foreground mb-4">
                    {profile.aiInsights.summary}
                  </p>
                  <div className="space-y-1.5">
                    {profile.aiInsights.strengths.slice(0, 3).map((s, i) => (
                      <p key={i} className="flex items-start gap-2 text-xs font-medium">
                        <span className="w-4 h-4 border border-black bg-green-400 flex items-center justify-center flex-shrink-0 mt-0.5 text-[9px] font-black">✓</span>
                        {s}
                      </p>
                    ))}
                    {profile.aiInsights.weaknesses.slice(0, 2).map((w, i) => (
                      <p key={i} className="flex items-start gap-2 text-xs font-medium">
                        <span className="w-4 h-4 border border-black bg-red-300 flex items-center justify-center flex-shrink-0 mt-0.5 text-[9px] font-black">✗</span>
                        {w}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* CTA buttons */}
            <div className="grid grid-cols-2 gap-4 compare-card">
              {([user1, user2] as const).map((u) => (
                <a
                  key={u}
                  href={`/analyze/${u}`}
                  className="flex items-center justify-center gap-2 border-2 border-black bg-white px-4 py-3 font-bold text-xs uppercase tracking-wide shadow-[3px_3px_0_#000] hover:shadow-[5px_5px_0_#000] hover:-translate-y-0.5 transition-all"
                >
                  Full Analysis: @{u}
                  <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
                </a>
              ))}
            </div>

            {/* Share this comparison */}
            <div className="compare-card">
              <button
                onClick={() => {
                  const url = `${window.location.origin}${window.location.pathname}${window.location.search}`;
                  navigator.clipboard.writeText(url).then(() => {
                    toast({
                      title: "Comparison link copied!",
                      description: `Share ${user1} vs ${user2} with anyone.`,
                    });
                  });
                }}
                className="w-full border-2 border-black bg-black text-white px-4 py-3 font-bold text-xs uppercase tracking-widest shadow-[3px_3px_0_#FF8D3F] hover:shadow-[5px_5px_0_#FF8D3F] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
              >
                🔗 Share this comparison
              </button>
            </div>

          </div>
        )}
      </div>
    </PageTransition>
  );
}
