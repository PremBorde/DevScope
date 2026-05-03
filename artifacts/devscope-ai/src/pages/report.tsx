import { useParams, useLocation } from "wouter";
import { useAnalyzeGithubUser, getAnalyzeGithubUserQueryKey } from "@workspace/api-client-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useToast } from "@/hooks/use-toast";
import { Link2, ArrowUpRight, ExternalLink, MapPin, Calendar, Users, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import PageTransition from "@/components/layout/PageTransition";

function ScoreColor(score: number) {
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
  const style = map[rec] ?? map["consider"];
  return (
    <span className={`inline-block px-4 py-2 border-2 border-black font-heading font-bold uppercase text-black text-sm shadow-[3px_3px_0_#000] ${style.bg}`}>
      {style.label}
    </span>
  );
}

function ReportSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-12 space-y-6">
      <Skeleton className="h-32 border-4 border-black rounded-none" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-52 border-4 border-black rounded-none" />
        <Skeleton className="h-52 border-4 border-black rounded-none" />
      </div>
      <Skeleton className="h-40 border-4 border-black rounded-none" />
    </div>
  );
}

export default function Report() {
  const params   = useParams<{ username: string }>();
  const username = params.username ?? "";
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data, isLoading, error, refetch } = useAnalyzeGithubUser(username, {
    query: { enabled: !!username, retry: false, queryKey: getAnalyzeGithubUserQueryKey(username) },
  });

  usePageTitle(
    data
      ? `${data.profile.name ?? username} — GitHub Report`
      : username
      ? `Report: @${username}`
      : "Report"
  );

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link copied!", description: "Anyone with this link can view this report." });
    } catch {
      toast({ title: "Copy failed", description: "Please copy the URL from the address bar.", variant: "destructive" });
    }
  };

  if (!username) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center min-h-[60vh] px-6">
          <div className="border-4 border-black bg-white p-12 shadow-[8px_8px_0_#000] text-center">
            <h2 className="font-heading font-black text-3xl uppercase mb-4">No username provided</h2>
            <button onClick={() => setLocation("/")} className="border-2 border-black bg-primary px-6 py-3 font-bold uppercase shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] hover:-translate-y-0.5 transition-all">
              Go Home
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (isLoading) {
    return (
      <PageTransition>
        <div className="border-b-4 border-black bg-primary px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-black flex items-center justify-center">
              <span className="font-heading font-bold text-sm text-white">DS</span>
            </div>
            <span className="font-heading font-black text-lg uppercase">Public Report</span>
          </div>
          <Skeleton className="h-9 w-28 border-2 border-black rounded-none" />
        </div>
        <ReportSkeleton />
      </PageTransition>
    );
  }

  if (error || !data) {
    const errMsg = (error as { message?: string })?.message ?? "Analysis failed or user not found";
    const isNotFound = errMsg.toLowerCase().includes("not found");
    return (
      <PageTransition>
        <div className="flex items-center justify-center min-h-[60vh] px-6">
          <div className="border-4 border-black bg-white p-12 shadow-[8px_8px_0_#000] text-center max-w-md w-full">
            <div className={`border-4 border-black p-4 inline-block mb-6 shadow-[4px_4px_0_#000] text-3xl ${isNotFound ? "bg-yellow-300" : "bg-red-400"}`}>
              {isNotFound ? "🔍" : "⚠️"}
            </div>
            <h2 className="font-heading font-black text-2xl uppercase mb-3">{isNotFound ? "User Not Found" : "Load Failed"}</h2>
            <p className="font-medium text-muted-foreground mb-8">{errMsg}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {!isNotFound && (
                <button onClick={() => void refetch()} className="flex items-center justify-center gap-2 border-2 border-black bg-primary px-5 py-2.5 font-bold uppercase shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] hover:-translate-y-0.5 transition-all">
                  <RefreshCw className="w-4 h-4" /> Retry
                </button>
              )}
              <button onClick={() => setLocation("/")} className="border-2 border-black bg-white px-5 py-2.5 font-bold uppercase shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] hover:-translate-y-0.5 transition-all">
                Try Another
              </button>
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  const { profile, repoStats, scoreBreakdown, aiInsights, analyzedAt } = data;
  const scoreColor = ScoreColor(scoreBreakdown.total);

  const breakdownItems = [
    { label: "Repo Quality",   value: scoreBreakdown.repoQuality,         max: 30 },
    { label: "Activity",       value: scoreBreakdown.activityConsistency,  max: 25 },
    { label: "Tech Diversity", value: scoreBreakdown.techDiversity,        max: 20 },
    { label: "Popularity",     value: scoreBreakdown.popularity,           max: 15 },
    { label: "Completeness",   value: scoreBreakdown.completeness,         max: 10 },
  ];

  return (
    <PageTransition>
      <div className="w-full bg-background min-h-screen">
        {/* Report Header */}
        <div className="border-b-4 border-black bg-primary px-4 md:px-6 py-4 flex items-center justify-between flex-wrap gap-3 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-black flex items-center justify-center flex-shrink-0">
              <span className="font-heading font-bold text-sm text-white">DS</span>
            </div>
            <span className="font-heading font-black text-base md:text-lg uppercase tracking-wide">
              DevScope AI — Public Report
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 border-2 border-black bg-white px-4 py-2 font-bold text-xs md:text-sm uppercase shadow-[3px_3px_0_#000] hover:shadow-[5px_5px_0_#000] hover:-translate-y-0.5 transition-all"
            >
              <Link2 className="w-4 h-4" />
              Copy Link
            </button>
            <button
              onClick={() => setLocation(`/analyze/${username}`)}
              className="flex items-center gap-2 border-2 border-black bg-black text-white px-4 py-2 font-bold text-xs md:text-sm uppercase shadow-[3px_3px_0_#000] hover:shadow-[5px_5px_0_#000] hover:-translate-y-0.5 transition-all"
            >
              Full Analysis
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 md:px-6 py-10 space-y-8">
          {/* Profile + Score Card */}
          <div className="border-4 border-black bg-white shadow-[8px_8px_0_#000] p-6 md:p-8">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <img
                src={profile.avatar_url}
                alt={profile.login}
                className="w-24 h-24 border-4 border-black shadow-[4px_4px_0_#000] flex-shrink-0"
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
                  @{profile.login}
                  <ExternalLink className="w-3 h-3" />
                </a>
                <div className="flex flex-wrap gap-4 text-sm font-semibold text-muted-foreground mb-4">
                  {profile.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />{profile.location}
                    </span>
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

              {/* Score Box */}
              <div className="flex flex-col items-center justify-center border-4 border-black bg-background p-6 shadow-[4px_4px_0_#000] min-w-[120px] flex-shrink-0">
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Score</span>
                <span className="font-heading font-black text-6xl leading-none" style={{ color: scoreColor }}>
                  {scoreBreakdown.total}
                </span>
                <span className="text-sm font-bold text-muted-foreground">/ 100</span>
              </div>
            </div>

            {/* Quick stats strip */}
            <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t-2 border-black">
              {[
                { label: "Public Repos", value: repoStats.totalRepos },
                { label: "Total Stars",  value: repoStats.totalStars.toLocaleString() },
                { label: "Total Forks",  value: repoStats.totalForks.toLocaleString() },
              ].map(({ label, value }) => (
                <div key={label} className="text-center border-2 border-black p-3 bg-background">
                  <p className="font-heading font-black text-2xl">{value}</p>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Score Breakdown + AI Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        className="h-full bg-primary border-r-2 border-black"
                        style={{ width: `${(value / max) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

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

          {/* Footer CTA */}
          <div className="border-4 border-black bg-black text-white p-7 shadow-[8px_8px_0_0_#FF8D3F] flex flex-col sm:flex-row items-center justify-between gap-5">
            <div>
              <p className="font-heading font-black text-xl uppercase">Want the full picture?</p>
              <p className="text-sm text-white/60 font-medium mt-1">
                AI roadmap, 30-day plan, score trend & history.
              </p>
            </div>
            <div className="flex gap-3 flex-shrink-0">
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-2 border-2 border-white bg-transparent text-white px-4 py-2.5 font-bold text-sm uppercase hover:bg-white hover:text-black transition-all"
              >
                <Link2 className="w-4 h-4" />
                Share
              </button>
              <button
                onClick={() => setLocation(`/analyze/${username}`)}
                className="flex items-center gap-2 border-2 border-primary bg-primary text-black px-5 py-2.5 font-bold text-sm uppercase shadow-[3px_3px_0_#FF8D3F] hover:shadow-[5px_5px_0_#FF8D3F] hover:-translate-y-0.5 transition-all"
              >
                Full Analysis
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground font-medium pb-4">
            Analyzed {new Date(analyzedAt).toLocaleString()} · DevScope AI
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
