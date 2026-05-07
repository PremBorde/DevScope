import { useParams, useLocation } from "wouter";
import {
  useGetReportByUsername,
  getGetReportByUsernameQueryKey,
} from "@workspace/api-client-react";
import type { AnalysisResult } from "@workspace/api-client-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useToast } from "@/hooks/use-toast";
import {
  Link2, ArrowUpRight, ExternalLink, MapPin, Calendar,
  Users, RefreshCw, Share2, GitFork, Star,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import PageTransition from "@/components/layout/PageTransition";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 70) return "#22c55e";
  if (score >= 50) return "#FF8D3F";
  return "#ef4444";
}

function HiringBadge({ rec }: { rec: string }) {
  const map: Record<string, { label: string; bg: string }> = {
    strong_hire: { label: "Strong Hire",   bg: "bg-green-400"  },
    hire:        { label: "Hire",          bg: "bg-blue-400"   },
    consider:    { label: "Consider",      bg: "bg-yellow-300" },
    pass:        { label: "Pass",          bg: "bg-red-400"    },
  };
  const s = map[rec] ?? map["consider"];
  return (
    <span className={`inline-block px-4 py-2 border-2 border-black font-heading font-bold uppercase text-black text-sm shadow-[3px_3px_0_#000] ${s.bg}`}>
      {s.label}
    </span>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ReportSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-12 space-y-6">
      <Skeleton className="h-40 border-4 border-black rounded-none" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-56 border-4 border-black rounded-none" />
        <Skeleton className="h-56 border-4 border-black rounded-none" />
      </div>
      <Skeleton className="h-40 border-4 border-black rounded-none" />
    </div>
  );
}

// ─── Shareable report body ────────────────────────────────────────────────────

export function ReportBody({
  data,
  shareUrl,
  snapshotId,
}: {
  data: AnalysisResult;
  shareUrl: string;
  snapshotId?: number;
}) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { profile, repoStats, scoreBreakdown, aiInsights, analyzedAt } = data;
  const color = scoreColor(scoreBreakdown.total);

  const breakdownItems = [
    { label: "Repo Quality",   value: scoreBreakdown.repoQuality,        max: 30 },
    { label: "Activity",       value: scoreBreakdown.activityConsistency, max: 25 },
    { label: "Tech Diversity", value: scoreBreakdown.techDiversity,       max: 20 },
    { label: "Popularity",     value: scoreBreakdown.popularity,          max: 15 },
    { label: "Completeness",   value: scoreBreakdown.completeness,        max: 10 },
  ];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "Link copied!", description: "Anyone with this link can view this report." });
    } catch {
      toast({ title: "Copy failed", description: "Copy the URL from the address bar.", variant: "destructive" });
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: `${profile.name ?? profile.login} — DevScope AI Report`,
        text: `Check out @${profile.login}'s GitHub profile scored ${scoreBreakdown.total}/100 by DevScope AI.`,
        url: shareUrl,
      }).catch(() => {/* dismissed */});
    } else {
      void handleCopy();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-10 space-y-8">

      {/* Profile + Score card */}
      <div className="border-4 border-black bg-white shadow-[8px_8px_0_#000] p-6 md:p-8">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <img
            src={profile.avatar_url}
            alt={profile.login}
            className="w-24 h-24 border-4 border-black shadow-[4px_4px_0_#000] flex-shrink-0 object-cover"
          />
          <div className="flex-1 min-w-0">
            <h1 className="font-heading font-black text-2xl md:text-3xl leading-tight">
              {profile.name ?? profile.login}
            </h1>
            <a
              href={profile.html_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-muted-foreground font-medium hover:text-primary transition-colors mb-3"
            >
              @{profile.login} <ExternalLink className="w-3 h-3" />
            </a>
            <div className="flex flex-wrap gap-4 text-sm font-semibold text-muted-foreground mb-4">
              {profile.location && (
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{profile.location}</span>
              )}
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />{profile.followers.toLocaleString()} followers
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />Since {profile.created_at?.split("T")[0]?.split("-")[0]}
              </span>
            </div>
            <HiringBadge rec={aiInsights.hiringRecommendation} />
          </div>

          {/* Score box */}
          <div
            className="flex flex-col items-center justify-center border-4 border-black bg-background p-6 shadow-[4px_4px_0_#000] min-w-[120px] flex-shrink-0"
            style={{ boxShadow: `4px 4px 0 ${color}` }}
          >
            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Score</span>
            <span className="font-heading font-black text-6xl leading-none" style={{ color }}>
              {scoreBreakdown.total}
            </span>
            <span className="text-sm font-bold text-muted-foreground">/ 100</span>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t-2 border-black">
          {[
            { icon: <GitFork className="w-4 h-4" />, label: "Repos",  value: repoStats.totalRepos },
            { icon: <Star className="w-4 h-4" />,    label: "Stars",  value: repoStats.totalStars.toLocaleString() },
            { icon: <GitFork className="w-4 h-4" />, label: "Forks",  value: repoStats.totalForks.toLocaleString() },
          ].map(({ icon, label, value }) => (
            <div key={label} className="text-center border-2 border-black p-3 bg-background">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">{icon}</div>
              <p className="font-heading font-black text-2xl">{value}</p>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Snapshot badge */}
        {snapshotId && (
          <div className="mt-4 pt-4 border-t-2 border-black flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
              Snapshot #{snapshotId} · {new Date(analyzedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest border border-black px-2 py-0.5 bg-yellow-200">
              🔒 Permanent Snapshot
            </span>
          </div>
        )}
      </div>

      {/* Breakdown + AI summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Score breakdown */}
        <div className="border-4 border-black bg-white shadow-[6px_6px_0_#000] p-6">
          <h2 className="font-heading font-black uppercase text-lg border-b-2 border-black pb-3 mb-5">
            Score Breakdown
          </h2>
          <div className="space-y-4">
            {breakdownItems.map(({ label, value, max }) => (
              <div key={label}>
                <div className="flex justify-between font-bold text-sm mb-1.5">
                  <span>{label}</span>
                  <span className="text-primary">{value}/{max}</span>
                </div>
                <div className="w-full h-3 bg-gray-100 border-2 border-black overflow-hidden">
                  <div
                    className="h-full bg-primary border-r-2 border-black transition-all duration-700"
                    style={{ width: `${(value / max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Executive summary */}
        <div className="border-4 border-black bg-white shadow-[6px_6px_0_#000] p-6">
          <h2 className="font-heading font-black uppercase text-lg border-b-2 border-black pb-3 mb-5">
            Executive Summary
          </h2>
          <p className="font-medium text-sm leading-relaxed text-muted-foreground mb-5">
            {aiInsights.summary}
          </p>
          <p className="text-xs font-black uppercase tracking-widest text-green-700 mb-3">Strengths</p>
          <ul className="space-y-2">
            {aiInsights.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm font-medium">
                <span className="w-4 h-4 border-2 border-black bg-green-400 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-black">✓</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Weaknesses + Suggestions */}
      <div className="border-4 border-black bg-white shadow-[6px_6px_0_#000] p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-red-700 border-b-2 border-black pb-2 mb-4">
              Areas for Improvement
            </p>
            <ul className="space-y-2.5">
              {aiInsights.weaknesses.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-sm font-medium">
                  <span className="w-4 h-4 border-2 border-black bg-red-400 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-black">✗</span>
                  {w}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-blue-700 border-b-2 border-black pb-2 mb-4">
              Suggestions
            </p>
            <ul className="space-y-2.5">
              {aiInsights.suggestions.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm font-medium">
                  <span className="w-5 h-5 border-2 border-black bg-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-black">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Languages */}
      {repoStats.topLanguages.length > 0 && (
        <div className="border-4 border-black bg-white shadow-[6px_6px_0_#000] p-6">
          <h2 className="font-heading font-black uppercase text-base border-b-2 border-black pb-3 mb-4">
            Top Languages
          </h2>
          <div className="flex flex-wrap gap-2">
            {repoStats.topLanguages.map((lang) => (
              <span key={lang} className="border-2 border-black px-3 py-1.5 font-bold text-sm uppercase tracking-wide shadow-[2px_2px_0_#000] bg-background">
                {lang}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer CTA */}
      <div className="border-4 border-black bg-black text-white p-7 shadow-[8px_8px_0_0_#FF8D3F] flex flex-col sm:flex-row items-center justify-between gap-5">
        <div>
          <p className="font-heading font-black text-xl uppercase">Want the full picture?</p>
          <p className="text-sm text-white/60 font-medium mt-1">
            AI roadmap, 30-day plan, score trend &amp; history.
          </p>
        </div>
        <div className="flex gap-3 flex-wrap flex-shrink-0">
          <button
            onClick={handleNativeShare}
            className="flex items-center gap-2 border-2 border-white bg-transparent text-white px-4 py-2.5 font-bold text-sm uppercase hover:bg-white hover:text-black transition-all"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 border-2 border-white bg-transparent text-white px-4 py-2.5 font-bold text-sm uppercase hover:bg-white hover:text-black transition-all"
          >
            <Link2 className="w-4 h-4" />
            Copy Link
          </button>
          <button
            onClick={() => setLocation(`/analyze/${profile.login}`)}
            className="flex items-center gap-2 border-2 border-primary bg-primary text-black px-5 py-2.5 font-bold text-sm uppercase shadow-[3px_3px_0_#FF8D3F] hover:shadow-[5px_5px_0_#FF8D3F] hover:-translate-y-0.5 transition-all"
          >
            Full Analysis
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Watermark */}
      <p className="text-center text-xs text-muted-foreground font-medium pb-4">
        Analyzed {new Date(analyzedAt).toLocaleString()} · Generated by DevScope AI
      </p>
    </div>
  );
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function Report() {
  const params   = useParams<{ username: string }>();
  const username = params.username ?? "";
  const [, setLocation] = useLocation();

  const { data, isLoading, error } = useGetReportByUsername(username, {
    query: {
      enabled: !!username,
      retry: false,
      queryKey: getGetReportByUsernameQueryKey(username),
    },
  });

  usePageTitle(
    data
      ? `${(data.profile as { name?: string; login: string }).name ?? username} — Public Report`
      : username
      ? `Report: @${username}`
      : "Public Report"
  );

  const profile = data?.profile as { login: string; name?: string } | undefined;

  // Permanent snapshot URL (by ID so it never changes)
  const snapshotUrl = data?.id
    ? `${window.location.origin}/report/view/${data.id}`
    : `${window.location.origin}/report/${username}`;

  if (!username) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center min-h-[60vh] px-6">
          <div className="border-4 border-black bg-white p-12 shadow-[8px_8px_0_#000] text-center">
            <h2 className="font-heading font-black text-3xl uppercase mb-4">No username provided</h2>
            <button onClick={() => setLocation("/")} className="border-2 border-black bg-primary px-6 py-3 font-bold uppercase shadow-[4px_4px_0_#000]">
              Go Home
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="w-full bg-background min-h-screen">

        {/* Sticky report header */}
        <ReportHeader
          username={username}
          displayName={profile?.name ?? username}
          snapshotUrl={snapshotUrl}
          isLoading={isLoading}
        />

        {isLoading && <ReportSkeleton />}

        {error && !isLoading && (
          <ReportError
            error={error}
            onRetry={() => setLocation("/")}
          />
        )}

        {data && !isLoading && (
          <ReportBody
            data={data as unknown as AnalysisResult}
            shareUrl={snapshotUrl}
            snapshotId={data.id}
          />
        )}
      </div>
    </PageTransition>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

export function ReportHeader({
  username,
  displayName,
  snapshotUrl,
  isLoading,
}: {
  username: string;
  displayName: string;
  snapshotUrl: string;
  isLoading?: boolean;
}) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snapshotUrl);
      toast({ title: "Link copied!", description: "Anyone with this link can view this report." });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: `${displayName} — DevScope AI Report`,
        text: `Check out @${username}'s GitHub profile scored by DevScope AI.`,
        url: snapshotUrl,
      }).catch(() => {/* dismissed */});
    } else {
      void handleCopy();
    }
  };

  return (
    <div className="border-b-4 border-black bg-primary px-4 md:px-6 py-3 flex items-center justify-between flex-wrap gap-3 sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-black flex items-center justify-center flex-shrink-0">
          <span className="font-heading font-bold text-sm text-white">DS</span>
        </div>
        <div>
          <span className="font-heading font-black text-base md:text-lg uppercase tracking-wide">
            DevScope AI
          </span>
          <span className="ml-2 text-[10px] font-black uppercase tracking-widest border border-black px-1.5 py-0.5 bg-black text-white">
            Public Report
          </span>
        </div>
      </div>

      {!isLoading && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleNativeShare}
            className="flex items-center gap-1.5 border-2 border-black bg-white px-3 py-2 font-bold text-xs uppercase shadow-[2px_2px_0_#000] hover:shadow-[4px_4px_0_#000] hover:-translate-y-0.5 transition-all"
          >
            <Share2 className="w-3.5 h-3.5" /> Share
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 border-2 border-black bg-white px-3 py-2 font-bold text-xs uppercase shadow-[2px_2px_0_#000] hover:shadow-[4px_4px_0_#000] hover:-translate-y-0.5 transition-all"
          >
            <Link2 className="w-3.5 h-3.5" /> Copy Link
          </button>
          <button
            onClick={() => setLocation(`/analyze/${username}`)}
            className="flex items-center gap-1.5 border-2 border-black bg-black text-white px-3 py-2 font-bold text-xs uppercase shadow-[2px_2px_0_#000] hover:shadow-[4px_4px_0_#000] hover:-translate-y-0.5 transition-all"
          >
            Full Analysis <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function ReportError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const errMsg = (error as { message?: string })?.message ?? "Report not found";
  const isNotFound = errMsg.toLowerCase().includes("not found");
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-6">
      <div className="border-4 border-black bg-white p-12 shadow-[8px_8px_0_#000] text-center max-w-md w-full">
        <div className={`border-4 border-black p-4 inline-block mb-6 shadow-[4px_4px_0_#000] text-3xl ${isNotFound ? "bg-yellow-300" : "bg-red-400"}`}>
          {isNotFound ? "🔍" : "⚠️"}
        </div>
        <h2 className="font-heading font-black text-2xl uppercase mb-3">
          {isNotFound ? "Report Not Found" : "Load Failed"}
        </h2>
        <p className="font-medium text-muted-foreground mb-8 text-sm">{errMsg}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {isNotFound && (
            <p className="text-xs text-muted-foreground font-medium w-full">
              Analyze this user first to generate a report.
            </p>
          )}
          <button
            onClick={onRetry}
            className="border-2 border-black bg-white px-5 py-2.5 font-bold uppercase shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] hover:-translate-y-0.5 transition-all"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
