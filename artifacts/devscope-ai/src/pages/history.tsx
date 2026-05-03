import { useRef, useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  useGetUserAnalysisHistory,
  useGetAnalysisHistory,
  getGetUserAnalysisHistoryQueryKey,
  getGetAnalysisHistoryQueryKey,
} from "@workspace/api-client-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Dot,
} from "recharts";
import { Search, RefreshCw, TrendingUp, Clock, ArrowUpRight, History } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  useStaggerEntrance,
  useScrollReveal,
  useCardHover,
} from "@/hooks/useAnimations";
import PageTransition from "@/components/layout/PageTransition";
import { usePageTitle } from "@/hooks/usePageTitle";

const SCORE_COLOR = (s: number) =>
  s >= 70 ? "#22c55e" : s >= 50 ? "#FF8D3F" : "#ef4444";

const HIRE_MAP: Record<string, { label: string; bg: string }> = {
  strong_hire: { label: "Strong Hire", bg: "bg-green-400" },
  hire:        { label: "Hire",        bg: "bg-blue-400"  },
  consider:    { label: "Consider",    bg: "bg-yellow-300"},
  pass:        { label: "Pass",        bg: "bg-red-400"   },
};

function HiringBadge({ rec }: { rec: string }) {
  const s = HIRE_MAP[rec] ?? HIRE_MAP["consider"];
  return (
    <span className={`inline-block px-2 py-0.5 border border-black font-bold uppercase text-black text-xs ${s.bg}`}>
      {s.label}
    </span>
  );
}

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (d < 60)  return "Just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatChartDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Custom animated dot for the line chart
function CustomDot(props: { cx?: number; cy?: number; payload?: { score: number } }) {
  const { cx, cy, payload } = props;
  if (!cx || !cy || !payload) return null;
  const color = SCORE_COLOR(payload.score);
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill={color} stroke="#000" strokeWidth={2} />
    </g>
  );
}

// Custom tooltip for the growth chart
function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; payload: { score: number; date: string } }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const score = payload[0].value;
  return (
    <div className="border-2 border-black bg-white p-3 shadow-[4px_4px_0_#000] text-sm">
      <p className="font-bold uppercase tracking-wide text-xs mb-1">{label}</p>
      <p className="font-heading font-black text-2xl" style={{ color: SCORE_COLOR(score) }}>
        {score}<span className="text-sm text-muted-foreground font-semibold">/100</span>
      </p>
    </div>
  );
}

export default function HistoryPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const cardHover = useCardHover();

  usePageTitle("Analysis History");

  const pageRef   = useRef<HTMLDivElement>(null);
  const tableRef  = useRef<HTMLDivElement>(null);
  const chartRef  = useRef<HTMLDivElement>(null);

  // Username to query — auto-filled from session
  const [search, setSearch] = useState("");
  const [activeUsername, setActiveUsername] = useState("");

  useEffect(() => {
    if (user?.username && !activeUsername) {
      setSearch(user.username);
      setActiveUsername(user.username);
    }
  }, [user?.username]);

  useScrollReveal(pageRef, ".reveal");
  useStaggerEntrance(tableRef, ".hist-row", { stagger: 0.04, delay: 0.05, y: 16 });

  // Recent global analyses (when no username selected)
  const { data: recent, isLoading: recentLoading } = useGetAnalysisHistory(
    { limit: 20 },
    { query: { queryKey: getGetAnalysisHistoryQueryKey({ limit: 20 }), enabled: !activeUsername } }
  );

  // User-specific analyses
  const { data: userHistory, isLoading: userLoading } = useGetUserAnalysisHistory(
    activeUsername,
    {
      query: {
        queryKey: getGetUserAnalysisHistoryQueryKey(activeUsername),
        enabled: !!activeUsername,
      },
    }
  );

  const isLoading = activeUsername ? userLoading : recentLoading;
  const rows = activeUsername ? (userHistory ?? []) : (recent ?? []);

  // Growth chart data — chronological order (oldest first)
  const chartData = activeUsername && userHistory && userHistory.length > 1
    ? [...userHistory]
        .sort((a, b) => new Date(a.analyzedAt).getTime() - new Date(b.analyzedAt).getTime())
        .map((r) => ({
          date:  formatChartDate(r.analyzedAt),
          score: Math.round(r.score),
          full:  r.analyzedAt,
        }))
    : [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const val = search.trim();
    if (val) setActiveUsername(val);
  };

  const handleReanalyze = (username: string) => {
    setLocation(`/analyze/${username}`);
  };

  // Score delta (first vs last)
  const scoreDelta =
    chartData.length >= 2
      ? chartData[chartData.length - 1].score - chartData[0].score
      : null;

  return (
    <PageTransition>
      <div ref={pageRef} className="w-full min-h-screen bg-background">
        {/* Header */}
        <div className="border-b-4 border-black px-6 py-8 bg-background flex items-end justify-between gap-6 flex-wrap">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-primary border-b-2 border-primary pb-0.5">
              Tracking
            </span>
            <h1 className="font-heading font-black text-5xl uppercase mt-2 leading-none flex items-center gap-3">
              <History className="w-10 h-10" />
              History
            </h1>
            <p className="text-muted-foreground font-semibold mt-2">
              {activeUsername
                ? `Showing all analyses for @${activeUsername}`
                : "Browse recent analyses across the platform"}
            </p>
          </div>

          {/* Username search */}
          <form onSubmit={handleSearch} className="flex gap-2 items-center">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="GitHub username…"
              className="h-12 w-56 border-2 border-black rounded-none shadow-[3px_3px_0_#000] focus-visible:ring-0 focus-visible:shadow-[5px_5px_0_#000] transition-all bg-white font-medium"
            />
            <Button
              type="submit"
              className="h-12 px-5 border-2 border-black rounded-none bg-primary text-black font-bold shadow-[3px_3px_0_#000] hover:bg-black hover:text-white hover:-translate-y-0.5 transition-all uppercase"
            >
              <Search className="w-4 h-4 mr-1" /> Search
            </Button>
            {activeUsername && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => { setActiveUsername(""); setSearch(""); }}
                className="h-12 px-3 border-2 border-black rounded-none shadow-[3px_3px_0_#000] font-bold uppercase hover:bg-black hover:text-white transition-all"
              >
                All
              </Button>
            )}
          </form>
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-6 py-10 space-y-10">

          {/* ── Growth Chart (only for specific username with 2+ entries) ── */}
          {chartData.length >= 2 && (
            <div
              ref={chartRef}
              className="reveal border-4 border-black bg-white p-7 shadow-[8px_8px_0_#000]"
              onMouseEnter={cardHover.onMouseEnter}
              onMouseLeave={cardHover.onMouseLeave}
            >
              <div className="flex items-start justify-between flex-wrap gap-4 mb-6 border-b-2 border-black pb-4">
                <div>
                  <span className="text-xs font-black uppercase tracking-widest text-primary">Growth</span>
                  <h2 className="font-heading font-black uppercase text-2xl mt-1 flex items-center gap-2">
                    <TrendingUp className="w-6 h-6" />
                    Your Growth Over Time
                  </h2>
                  <p className="text-muted-foreground font-medium text-sm mt-1">
                    Score trajectory for @{activeUsername} across {chartData.length} analyses
                  </p>
                </div>

                {scoreDelta !== null && (
                  <div
                    className={`border-2 border-black px-4 py-3 shadow-[3px_3px_0_#000] text-center ${
                      scoreDelta > 0 ? "bg-green-100" : scoreDelta < 0 ? "bg-red-100" : "bg-muted"
                    }`}
                  >
                    <p className="text-xs font-bold uppercase tracking-widest mb-0.5">Overall Change</p>
                    <p
                      className="font-heading font-black text-2xl"
                      style={{ color: scoreDelta > 0 ? "#16a34a" : scoreDelta < 0 ? "#dc2626" : "#000" }}
                    >
                      {scoreDelta > 0 ? "+" : ""}{scoreDelta} pts
                    </p>
                  </div>
                )}
              </div>

              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#e5e5e5" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fontWeight: 700 }}
                    tickLine={false}
                    axisLine={{ stroke: "#000", strokeWidth: 2 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fontWeight: 700 }}
                    tickLine={false}
                    axisLine={{ stroke: "#000", strokeWidth: 2 }}
                    tickFormatter={(v) => `${v}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  {/* Grade zone lines */}
                  <ReferenceLine y={70} stroke="#22c55e" strokeDasharray="6 3" strokeWidth={1.5} label={{ value: "Hire", position: "insideRight", fontSize: 10, fontWeight: 700, fill: "#16a34a" }} />
                  <ReferenceLine y={50} stroke="#FF8D3F" strokeDasharray="6 3" strokeWidth={1.5} label={{ value: "Consider", position: "insideRight", fontSize: 10, fontWeight: 700, fill: "#ea6c00" }} />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#FF8D3F"
                    strokeWidth={3}
                    dot={<CustomDot />}
                    activeDot={{ r: 8, stroke: "#000", strokeWidth: 2, fill: "#FF8D3F" }}
                    animationBegin={200}
                    animationDuration={1200}
                    animationEasing="ease-out"
                  />
                </LineChart>
              </ResponsiveContainer>

              {/* Grade legend */}
              <div className="flex gap-5 mt-4 text-xs font-bold">
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-green-500 inline-block" />70+ = Hire</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-primary inline-block" />50-69 = Consider</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-red-400 inline-block" />Under 50 = Pass</span>
              </div>
            </div>
          )}

          {/* ── Summary stats (when username selected) ── */}
          {activeUsername && userHistory && userHistory.length > 0 && (
            <div className="reveal grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: "Total Analyses",
                  value: userHistory.length,
                  bg: "bg-primary",
                  rotation: "-0.8deg",
                },
                {
                  label: "Best Score",
                  value: Math.max(...userHistory.map((r) => Math.round(r.score))),
                  bg: "bg-white",
                  rotation: "0.6deg",
                },
                {
                  label: "Latest Score",
                  value: Math.round(userHistory[0]?.score ?? 0),
                  bg: "bg-white",
                  rotation: "-0.4deg",
                },
                {
                  label: "Avg Score",
                  value: Math.round(
                    userHistory.reduce((s, r) => s + r.score, 0) / userHistory.length
                  ),
                  bg: "bg-white",
                  rotation: "0.8deg",
                },
              ].map(({ label, value, bg, rotation }) => (
                <div
                  key={label}
                  className={`border-4 border-black p-5 shadow-[4px_4px_0_#000] will-change-transform ${bg}`}
                  style={{ transform: `rotate(${rotation})` }}
                  onMouseEnter={cardHover.onMouseEnter}
                  onMouseLeave={cardHover.onMouseLeave}
                >
                  <p className="text-xs font-black uppercase tracking-widest mb-2 text-muted-foreground">
                    {label}
                  </p>
                  <p
                    className="font-heading font-black text-4xl"
                    style={
                      label !== "Total Analyses"
                        ? { color: SCORE_COLOR(Number(value)) }
                        : undefined
                    }
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* ── History Table ── */}
          <div className="reveal border-4 border-black bg-white p-7 shadow-[6px_6px_0_#000]">
            <div className="flex items-center justify-between mb-5 border-b-2 border-black pb-3">
              <h2 className="font-heading font-black uppercase text-xl flex items-center gap-2">
                <Clock className="w-5 h-5" />
                {activeUsername ? `@${activeUsername}'s Analyses` : "Recent Platform Analyses"}
              </h2>
              {activeUsername && (
                <Button
                  onClick={() => handleReanalyze(activeUsername)}
                  className="h-9 px-5 text-sm font-bold border-2 border-black rounded-none bg-primary text-black hover:bg-black hover:text-white shadow-[3px_3px_0_#000] hover:-translate-y-0.5 transition-all uppercase flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Re-analyze
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 border-2 border-black bg-gray-50 animate-pulse" />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-black">
                <p className="font-heading font-bold text-xl uppercase mb-3">
                  {activeUsername ? `No history for @${activeUsername}` : "No analyses yet"}
                </p>
                <p className="text-muted-foreground font-medium mb-6">
                  {activeUsername
                    ? "Analyze this profile to start tracking"
                    : "Analyze a GitHub profile to get started"}
                </p>
                <Button
                  onClick={() => activeUsername ? handleReanalyze(activeUsername) : setLocation("/")}
                  className="border-2 border-black rounded-none bg-primary text-black px-6 py-3 font-bold uppercase shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] hover:-translate-y-0.5 transition-all"
                >
                  {activeUsername ? `Analyze @${activeUsername}` : "Analyze Now"}
                </Button>
              </div>
            ) : (
              <div ref={tableRef} className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-black">
                      <th className="text-left py-3 px-3 font-heading font-bold uppercase text-sm">User</th>
                      <th className="text-left py-3 px-3 font-heading font-bold uppercase text-sm">Score</th>
                      <th className="text-left py-3 px-3 font-heading font-bold uppercase text-sm hidden md:table-cell">Verdict</th>
                      <th className="text-left py-3 px-3 font-heading font-bold uppercase text-sm hidden lg:table-cell">Languages</th>
                      <th className="text-left py-3 px-3 font-heading font-bold uppercase text-sm">When</th>
                      <th className="text-left py-3 px-3 font-heading font-bold uppercase text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((item) => (
                      <tr
                        key={item.id}
                        className="hist-row border-b border-black hover:bg-background transition-colors will-change-transform group"
                        style={{ opacity: 0 }}
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            {item.avatarUrl && (
                              <img
                                src={item.avatarUrl}
                                alt={item.username}
                                className="w-8 h-8 border-2 border-black flex-shrink-0"
                              />
                            )}
                            <button
                              onClick={() => { setSearch(item.username); setActiveUsername(item.username); }}
                              className="font-bold hover:text-primary transition-colors"
                            >
                              @{item.username}
                            </button>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className="font-heading font-black text-xl"
                            style={{ color: SCORE_COLOR(item.score) }}
                          >
                            {Math.round(item.score)}
                          </span>
                        </td>

                        <td className="py-3 px-3 hidden md:table-cell">
                          <HiringBadge rec={item.hiringRecommendation} />
                        </td>

                        <td className="py-3 px-3 hidden lg:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {item.topLanguages.slice(0, 3).map((lang, li) => (
                              <span
                                key={lang}
                                className="text-xs border border-black px-1.5 py-0.5 font-bold"
                                style={{
                                  backgroundColor:
                                    ["#FF8D3F","#000","#22c55e","#3b82f6","#a855f7"][li % 5],
                                  color: li === 1 ? "#fff" : "#000",
                                }}
                              >
                                {lang}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-sm text-muted-foreground font-medium whitespace-nowrap">
                          {timeAgo(item.analyzedAt)}
                        </td>

                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            {/* Re-analyze */}
                            <button
                              onClick={() => handleReanalyze(item.username)}
                              title="Re-analyze"
                              className="flex items-center gap-1 border-2 border-black bg-white px-2.5 py-1.5 text-xs font-bold uppercase shadow-[2px_2px_0_#000] hover:bg-primary hover:shadow-[3px_3px_0_#000] hover:-translate-y-0.5 transition-all"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Re-analyze
                            </button>
                            {/* View result */}
                            <button
                              onClick={() => setLocation(`/analyze/${item.username}`)}
                              title="View analysis"
                              className="border-2 border-black bg-white p-1.5 shadow-[2px_2px_0_#000] hover:bg-black hover:text-white hover:-translate-y-0.5 transition-all"
                            >
                              <ArrowUpRight className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── CTA if no username selected ── */}
          {!activeUsername && (
            <div className="reveal border-4 border-black bg-primary p-8 shadow-[8px_8px_0_#000] text-center rotate-1">
              <h2 className="font-heading font-black uppercase text-2xl mb-3">Track your own progress</h2>
              <p className="font-semibold text-black/70 mb-5">Enter your GitHub username above to see your personal history and growth chart</p>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
