import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useAnalyzeGithubUser, getAnalyzeGithubUserQueryKey } from "@workspace/api-client-react";
import type { AnalysisResult } from "@workspace/api-client-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ArrowRight, Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import PageTransition from "@/components/layout/PageTransition";

type MetricKey = "repoQuality" | "activityConsistency" | "techDiversity" | "popularity" | "completeness";

const METRICS: { key: MetricKey; label: string; max: number }[] = [
  { key: "repoQuality",         label: "Repo Quality",   max: 30 },
  { key: "activityConsistency", label: "Activity",       max: 25 },
  { key: "techDiversity",       label: "Tech Diversity", max: 20 },
  { key: "popularity",          label: "Popularity",     max: 15 },
  { key: "completeness",        label: "Completeness",   max: 10 },
];

function generateVerdict(a: AnalysisResult, aName: string, b: AnalysisResult, bName: string): string {
  const aScore = a.scoreBreakdown.total;
  const bScore = b.scoreBreakdown.total;
  const winner = aScore >= bScore ? a : b;
  const wName  = aScore >= bScore ? aName : bName;
  const loser  = aScore >= bScore ? b : a;
  const lName  = aScore >= bScore ? bName : aName;

  const advantages = METRICS
    .filter(({ key }) => (winner.scoreBreakdown[key] ?? 0) > (loser.scoreBreakdown[key] ?? 0))
    .map(({ label }) => label.toLowerCase());

  const diff = Math.abs(aScore - bScore);
  const topEdges = advantages.slice(0, 2).join(" and ");
  const recW = winner.aiInsights.hiringRecommendation.replace("_", " ");
  const recL = loser.aiInsights.hiringRecommendation.replace("_", " ");

  if (diff < 5) {
    return `@${aName} and @${bName} are closely matched (${aScore} vs ${bScore}). @${wName} has a marginal edge${topEdges ? ` in ${topEdges}` : ""}. Both are rated "${recW}" and "${recL}" respectively.`;
  }

  return `@${wName} is the stronger candidate, scoring ${winner.scoreBreakdown.total}/100 vs ${loser.scoreBreakdown.total}/100${topEdges ? `, with clear advantages in ${topEdges}` : ""}. Verdict: @${wName} is "${recW}" while @${lName} is "${recL}".`;
}

function HiringBadge({ rec }: { rec: string }) {
  const map: Record<string, { label: string; bg: string }> = {
    strong_hire: { label: "Strong Hire",   bg: "bg-green-400"  },
    hire:        { label: "Hire",          bg: "bg-blue-400"   },
    consider:    { label: "Consider",      bg: "bg-yellow-300" },
    pass:        { label: "Pass",          bg: "bg-red-400"    },
  };
  const style = map[rec] ?? map["consider"];
  return (
    <span className={`inline-block px-3 py-1 border-2 border-black font-bold uppercase text-black text-xs shadow-[2px_2px_0_#000] ${style.bg}`}>
      {style.label}
    </span>
  );
}

function MetricRow({
  label, aValue, bValue, max, loadingA, loadingB, bold,
}: {
  label: string; aValue?: number; bValue?: number; max?: number;
  loadingA: boolean; loadingB: boolean; bold?: boolean;
}) {
  const aWins = aValue !== undefined && bValue !== undefined && aValue > bValue;
  const bWins = aValue !== undefined && bValue !== undefined && bValue > aValue;
  const suffix = max ? `/${max}` : "/100";

  return (
    <div className="grid grid-cols-[1fr_160px_1fr] border-b-2 border-black last:border-b-0">
      {/* A side */}
      <div className={`flex items-center justify-end px-5 md:px-7 py-4 ${aWins ? "bg-green-50" : ""}`}>
        {loadingA ? (
          <Skeleton className="h-7 w-16 rounded-none border border-black" />
        ) : aValue !== undefined ? (
          <div className="flex items-center gap-2">
            {aWins && <span className="text-green-600 font-black text-xs leading-none">▲</span>}
            <span className={`font-heading font-black ${bold ? "text-4xl" : "text-2xl"} ${aWins ? "text-green-600" : ""}`}>
              {aValue}{suffix}
            </span>
          </div>
        ) : <span className="text-muted-foreground font-medium">—</span>}
      </div>

      {/* Label */}
      <div className="flex items-center justify-center px-3 py-4 bg-gray-50 border-l-2 border-r-2 border-black">
        <span className="font-bold text-xs md:text-sm uppercase tracking-wide text-center leading-tight">{label}</span>
      </div>

      {/* B side */}
      <div className={`flex items-center justify-start px-5 md:px-7 py-4 ${bWins ? "bg-green-50" : ""}`}>
        {loadingB ? (
          <Skeleton className="h-7 w-16 rounded-none border border-black" />
        ) : bValue !== undefined ? (
          <div className="flex items-center gap-2">
            <span className={`font-heading font-black ${bold ? "text-4xl" : "text-2xl"} ${bWins ? "text-green-600" : ""}`}>
              {bValue}{suffix}
            </span>
            {bWins && <span className="text-green-600 font-black text-xs leading-none">▲</span>}
          </div>
        ) : <span className="text-muted-foreground font-medium">—</span>}
      </div>
    </div>
  );
}

function ProfileCard({
  username, data, isLoading, error,
}: {
  username: string;
  data?: AnalysisResult;
  isLoading: boolean;
  error: unknown;
}) {
  if (isLoading) {
    return (
      <div className="border-4 border-black bg-white shadow-[6px_6px_0_#000] p-5 space-y-3">
        <div className="flex items-center gap-4">
          <Skeleton className="w-14 h-14 border-2 border-black rounded-none flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32 border border-black rounded-none" />
            <Skeleton className="h-4 w-20 border border-black rounded-none" />
          </div>
        </div>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="border-4 border-black bg-red-50 shadow-[6px_6px_0_#000] p-5 text-center">
        <p className="font-bold text-sm">Could not load @{username}</p>
        <p className="text-xs text-muted-foreground mt-1">{(error as { message?: string })?.message ?? "User not found"}</p>
      </div>
    );
  }
  return (
    <div className="border-4 border-black bg-white shadow-[6px_6px_0_#000] p-5">
      <div className="flex items-start gap-4">
        <img src={data.profile.avatar_url} alt={username} className="w-14 h-14 border-4 border-black shadow-[3px_3px_0_#000] flex-shrink-0" />
        <div className="min-w-0">
          <h3 className="font-heading font-black text-xl leading-tight truncate">{data.profile.name ?? username}</h3>
          <p className="text-sm text-muted-foreground font-medium">@{username}</p>
          <p className="text-xs text-muted-foreground font-medium">{data.repoStats.totalRepos} repos · {data.profile.followers.toLocaleString()} followers</p>
          <div className="mt-2">
            <HiringBadge rec={data.aiInsights.hiringRecommendation} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Compare() {
  const params   = useParams<{ userA?: string; userB?: string }>();
  const [, setLocation] = useLocation();

  const [inputA, setInputA] = useState(params.userA ?? "");
  const [inputB, setInputB] = useState(params.userB ?? "");

  const userA = params.userA ?? "";
  const userB = params.userB ?? "";

  usePageTitle(userA && userB ? `${userA} vs ${userB}` : "Compare Profiles");

  const queryA = useAnalyzeGithubUser(userA, { query: { enabled: !!userA, retry: false, queryKey: getAnalyzeGithubUserQueryKey(userA) } });
  const queryB = useAnalyzeGithubUser(userB, { query: { enabled: !!userB, retry: false, queryKey: getAnalyzeGithubUserQueryKey(userB) } });

  const handleCompare = (e: React.FormEvent) => {
    e.preventDefault();
    const a = inputA.trim();
    const b = inputB.trim();
    if (a && b) setLocation(`/compare/${a}/${b}`);
  };

  const bothLoaded  = !!queryA.data && !!queryB.data;
  const showResults = !!(userA && userB);

  return (
    <PageTransition>
      <div className="w-full min-h-screen bg-background">
        {/* Header + Form */}
        <div className="border-b-4 border-black bg-background px-4 md:px-6 py-8">
          <div className="max-w-5xl mx-auto">
            <span className="text-xs font-black uppercase tracking-widest text-primary border-b-2 border-primary pb-0.5">
              DevScope AI
            </span>
            <h1 className="font-heading font-black uppercase text-4xl md:text-5xl mt-2 mb-7 leading-none">
              ⚔️ Compare Profiles
            </h1>

            <form onSubmit={handleCompare} className="flex flex-col sm:flex-row gap-3 items-stretch max-w-3xl">
              <input
                value={inputA}
                onChange={(e) => setInputA(e.target.value)}
                placeholder="First GitHub username…"
                required
                className="flex-1 h-14 px-5 border-4 border-black bg-white font-semibold text-base shadow-[4px_4px_0_#000] focus:outline-none focus:shadow-[6px_6px_0_#000] transition-all placeholder:text-muted-foreground"
              />
              <div className="flex items-center justify-center font-black text-lg uppercase px-2 flex-shrink-0">
                vs
              </div>
              <input
                value={inputB}
                onChange={(e) => setInputB(e.target.value)}
                placeholder="Second GitHub username…"
                required
                className="flex-1 h-14 px-5 border-4 border-black bg-white font-semibold text-base shadow-[4px_4px_0_#000] focus:outline-none focus:shadow-[6px_6px_0_#000] transition-all placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                className="h-14 px-8 border-4 border-black bg-primary font-black uppercase text-sm shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 flex-shrink-0"
              >
                Compare <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {showResults && (
          <div className="max-w-5xl mx-auto px-4 md:px-6 py-10 space-y-8">
            {/* Profile Cards */}
            <div className="grid grid-cols-2 gap-5">
              <ProfileCard username={userA} data={queryA.data} isLoading={queryA.isLoading} error={queryA.error} />
              <ProfileCard username={userB} data={queryB.data} isLoading={queryB.isLoading} error={queryB.error} />
            </div>

            {/* Comparison Table */}
            <div className="border-4 border-black bg-white shadow-[8px_8px_0_#000] overflow-hidden">
              {/* Column labels */}
              <div className="grid grid-cols-[1fr_160px_1fr] border-b-4 border-black bg-background">
                <div className="flex items-center justify-end px-5 md:px-7 py-3">
                  <span className="font-black text-sm uppercase tracking-widest text-muted-foreground">@{userA}</span>
                </div>
                <div className="flex items-center justify-center px-3 py-3 bg-black border-l-2 border-r-2 border-black">
                  <span className="font-black text-xs uppercase tracking-widest text-white">Metric</span>
                </div>
                <div className="flex items-center justify-start px-5 md:px-7 py-3">
                  <span className="font-black text-sm uppercase tracking-widest text-muted-foreground">@{userB}</span>
                </div>
              </div>

              {/* Total Score */}
              <MetricRow
                label="Overall Score"
                aValue={queryA.data?.scoreBreakdown.total}
                bValue={queryB.data?.scoreBreakdown.total}
                loadingA={queryA.isLoading}
                loadingB={queryB.isLoading}
                bold
              />

              {/* Per-category metrics */}
              {METRICS.map(({ key, label, max }) => (
                <MetricRow
                  key={key}
                  label={label}
                  aValue={queryA.data?.scoreBreakdown[key]}
                  bValue={queryB.data?.scoreBreakdown[key]}
                  max={max}
                  loadingA={queryA.isLoading}
                  loadingB={queryB.isLoading}
                />
              ))}

              {/* Repos row */}
              <MetricRow
                label="Public Repos"
                aValue={queryA.data?.repoStats.totalRepos}
                bValue={queryB.data?.repoStats.totalRepos}
                loadingA={queryA.isLoading}
                loadingB={queryB.isLoading}
              />

              {/* Stars row */}
              <MetricRow
                label="Total Stars"
                aValue={queryA.data?.repoStats.totalStars}
                bValue={queryB.data?.repoStats.totalStars}
                loadingA={queryA.isLoading}
                loadingB={queryB.isLoading}
              />
            </div>

            {/* Verdict */}
            {bothLoaded && (
              <div className="border-4 border-black bg-black text-white p-7 shadow-[8px_8px_0_0_#FF8D3F]">
                <div className="flex items-start gap-4">
                  <Trophy className="w-8 h-8 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-primary mb-2">
                      Final Verdict
                    </p>
                    <p className="font-bold text-lg leading-relaxed">
                      {generateVerdict(queryA.data!, userA, queryB.data!, userB)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* AI Summary Comparison */}
            {bothLoaded && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {([
                  { username: userA, data: queryA.data! },
                  { username: userB, data: queryB.data! },
                ] as const).map(({ username, data }) => (
                  <div key={username} className="border-4 border-black bg-white shadow-[6px_6px_0_#000] p-6">
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">
                      @{username}
                    </p>
                    <p className="font-heading font-black uppercase text-base border-b-2 border-black pb-3 mb-4">
                      AI Summary
                    </p>
                    <p className="font-medium text-sm leading-relaxed text-muted-foreground">
                      {data.aiInsights.summary}
                    </p>
                    <div className="mt-4 space-y-1.5">
                      {data.aiInsights.strengths.slice(0, 2).map((s, i) => (
                        <p key={i} className="flex items-start gap-2 text-xs font-medium">
                          <span className="w-3.5 h-3.5 border border-black bg-green-400 flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-black">✓</span>
                          {s}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* CTA to full profiles */}
            {bothLoaded && (
              <div className="grid grid-cols-2 gap-4">
                {[userA, userB].map((u) => (
                  <a
                    key={u}
                    href={`/analyze/${u}`}
                    className="flex items-center justify-center gap-2 border-2 border-black bg-white px-4 py-3 font-bold text-sm uppercase shadow-[3px_3px_0_#000] hover:shadow-[5px_5px_0_#000] hover:-translate-y-0.5 transition-all text-center"
                  >
                    Full Analysis: @{u}
                    <ArrowRight className="w-4 h-4" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {!showResults && (
          <div className="max-w-5xl mx-auto px-4 md:px-6 py-16 text-center">
            <p className="text-4xl mb-4">🔎</p>
            <p className="font-heading font-black text-2xl uppercase mb-3">Enter two usernames above</p>
            <p className="text-muted-foreground font-medium">
              We'll run a side-by-side comparison and give you a definitive verdict.
            </p>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
