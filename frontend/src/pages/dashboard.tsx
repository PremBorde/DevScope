import { useRef, useState, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import {
  useGetAnalysisHistory,
  useGetPlatformStats,
  useGetScoreTrend,
  getGetAnalysisHistoryQueryKey,
  getGetPlatformStatsQueryKey,
  getGetScoreTrendQueryKey,
} from "@workspace/api-client-react";
import type { ScoreTrendPoint } from "@workspace/api-client-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Users, Activity, TrendingUp, Clock, Search, TrendingDown, Minus } from "lucide-react";
import {
  useStaggerEntrance,
  useScrollReveal,
  useCardHover,
} from "@/hooks/useAnimations";
import PageTransition from "@/components/layout/PageTransition";
import { usePageTitle } from "@/hooks/usePageTitle";

// Modular Components
import { HiringBadge } from "@/components/dashboard/HiringBadge";
import { ScoreTrendChart } from "@/components/dashboard/ScoreTrendChart";

function timeAgo(isoDate: string) {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const HIRE_COLORS: Record<string, string> = {
  strong_hire: "#22c55e",
  hire: "#3b82f6",
  consider: "#eab308",
  pass: "#ef4444",
};

const LANG_COLORS = ["#FF8D3F", "#000000", "#22c55e", "#3b82f6", "#a855f7", "#ef4444", "#f59e0b", "#06b6d4", "#10b981", "#8b5cf6"];

function scoreColor(score: number) {
  if (score >= 70) return "#22c55e";
  if (score >= 50) return "#FF8D3F";
  return "#ef4444";
}

interface CustomTrendTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: ScoreTrendPoint }>;
}

function CustomTrendTooltip({ active, payload }: CustomTrendTooltipProps) {
  if (!active || !payload?.length) return null;
  const score = payload[0].value;
  return (
    <div className="border-2 border-black bg-white shadow-[3px_3px_0_#000] px-3 py-2">
      <p className="font-black text-xl" style={{ color: scoreColor(score) }}>{score}</p>
      <p className="text-xs font-bold uppercase text-muted-foreground">/ 100</p>
    </div>
  );
}

interface CustomLatestDotProps {
  cx?: number;
  cy?: number;
  value?: number;
  index?: number;
  dataLength?: number;
}

function CustomLatestDot({ cx, cy, value, index, dataLength }: CustomLatestDotProps) {
  const isLatest = index === (dataLength ?? 0) - 1;
  if (!isLatest || cx === undefined || cy === undefined) return null;
  const color = scoreColor(value ?? 0);
  return (
    <g>
      <circle cx={cx} cy={cy} r={10} fill={color} stroke="#000" strokeWidth={2.5} />
      <circle cx={cx} cy={cy} r={5} fill="#fff" />
    </g>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();

  const statsGridRef = useRef<HTMLDivElement>(null);
  const pageRef      = useRef<HTMLDivElement>(null);
  const chartsRef    = useRef<HTMLDivElement>(null);
  const tableRef     = useRef<HTMLDivElement>(null);
  const trendRef     = useRef<HTMLDivElement>(null);

  const cardHover = useCardHover();

  usePageTitle("Dashboard");
  useStaggerEntrance(statsGridRef, ".stat-card", { stagger: 0.1 });
  useScrollReveal(pageRef, ".reveal");
  useStaggerEntrance(chartsRef, ".chart-card", { stagger: 0.15, delay: 0.1 });
  useStaggerEntrance(tableRef, ".table-row", { stagger: 0.04, delay: 0.1, y: 16 });

  const { data: history, isLoading: histLoading } = useGetAnalysisHistory(
    { limit: 20 },
    { query: { queryKey: getGetAnalysisHistoryQueryKey({ limit: 20 }) } }
  );

  const { data: stats, isLoading: statsLoading } = useGetPlatformStats({
    query: { queryKey: getGetPlatformStatsQueryKey() },
  });

  const hiringData = useMemo(
    () =>
      stats?.hiringBreakdown
        ? Object.entries(stats.hiringBreakdown).map(([key, count]) => ({
            name: key.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            value: count,
            color: HIRE_COLORS[key] || "#ccc",
          }))
        : [],
    [stats],
  );

  const langBarData = useMemo(
    () =>
      stats?.topLanguages?.slice(0, 8).map((lang, i) => ({
        name: lang,
        value: history?.filter((h) => h.topLanguages?.includes(lang)).length ?? 0,
        fill: LANG_COLORS[i % LANG_COLORS.length],
      })) ?? [],
    [stats, history],
  );

  // --- Score Trend state ---
  const [inputValue, setInputValue]       = useState("");
  const [trendUsername, setTrendUsername] = useState("");

  const { data: trendData, isLoading: trendLoading } = useGetScoreTrend(
    trendUsername,
    { query: { queryKey: getGetScoreTrendQueryKey(trendUsername), enabled: !!trendUsername, staleTime: 1000 * 60 * 5 } }
  );

  const handleTrendSearch = useCallback(() => {
    const trimmed = inputValue.trim().toLowerCase();
    if (trimmed) setTrendUsername(trimmed);
  }, [inputValue]);

  const overallChange = useMemo(() => {
    if (!trendData || trendData.length < 2) return null;
    return trendData[trendData.length - 1].score - trendData[0].score;
  }, [trendData]);

  return (
    <PageTransition>
      <div ref={pageRef} className="w-full min-h-screen bg-background">
        <div className="border-b-4 border-black px-6 py-8 bg-background">
          <span className="text-xs font-black uppercase tracking-widest text-primary border-b-2 border-primary pb-0.5">Overview</span>
          <h1 className="font-heading font-black text-5xl uppercase mt-2 leading-none">Dashboard</h1>
          <p className="text-muted-foreground font-semibold mt-2">Platform-wide analytics and recent analyses</p>
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-6 py-10 space-y-10">
          {/* Platform Stats */}
          <div ref={statsGridRef} className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {[
              { label: "Total Analyses", value: stats?.totalAnalyses ?? 0, icon: <Activity className="w-5 h-5" />, rotation: "-1deg", bg: "bg-primary" },
              { label: "Unique Users", value: stats?.uniqueUsers ?? 0, icon: <Users className="w-5 h-5" />, rotation: "0.8deg", bg: "bg-white" },
              { label: "Avg Score", value: stats ? `${stats.avgScore}` : "0", icon: <TrendingUp className="w-5 h-5" />, rotation: "-0.5deg", bg: "bg-white" },
              { label: "Recent Analyses", value: history?.length ?? 0, icon: <Clock className="w-5 h-5" />, rotation: "1deg", bg: "bg-white" },
            ].map(({ label, value, icon, rotation, bg }) => (
              <div
                key={label}
                className={`stat-card border-4 border-black p-6 shadow-[5px_5px_0_#000] ${bg}`}
                style={{ transform: `rotate(${rotation})` }}
                onMouseEnter={cardHover.onMouseEnter}
                onMouseLeave={cardHover.onMouseLeave}
              >
                <div className="flex items-center gap-2 text-muted-foreground mb-3">
                  {icon}
                  <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
                </div>
                <p className="font-heading font-black text-4xl">
                  {statsLoading ? <span className="animate-pulse">...</span> : value}
                </p>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div ref={chartsRef} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              className="chart-card border-4 border-black bg-white p-7 shadow-[6px_6px_0_#000]"
              onMouseEnter={cardHover.onMouseEnter}
              onMouseLeave={cardHover.onMouseLeave}
            >
              <h2 className="font-heading font-black uppercase text-xl mb-5 border-b-2 border-black pb-2">Top Languages</h2>
              {langBarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={langBarData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" radius={0}>
                      {langBarData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} stroke="#000" strokeWidth={1} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground font-medium">
                  {statsLoading ? "Loading..." : "No data yet"}
                </div>
              )}
            </div>

            <div
              className="chart-card border-4 border-black bg-white p-7 shadow-[6px_6px_0_#000]"
              onMouseEnter={cardHover.onMouseEnter}
              onMouseLeave={cardHover.onMouseLeave}
            >
              <h2 className="font-heading font-black uppercase text-xl mb-5 border-b-2 border-black pb-2">Hiring Breakdown</h2>
              {hiringData.some((d) => d.value > 0) ? (
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width="60%" height={180}>
                    <PieChart>
                      <Pie
                        data={hiringData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={72}
                        dataKey="value"
                        stroke="#000"
                        strokeWidth={2}
                      >
                        {hiringData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2.5">
                    {hiringData.map((d) => (
                      <div key={d.name} className="flex items-center gap-2 text-sm font-bold">
                        <span className="w-3 h-3 border border-black flex-shrink-0" style={{ backgroundColor: d.color }} />
                        {d.name}: {d.value}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground font-medium">
                  {statsLoading ? "Loading..." : "No data yet"}
                </div>
              )}
            </div>
          </div>

          {/* ── Your Growth Over Time ────────────────────────────────────── */}
          <div
            ref={trendRef}
            className="reveal border-4 border-black bg-white shadow-[6px_6px_0_#000]"
            onMouseEnter={cardHover.onMouseEnter}
            onMouseLeave={cardHover.onMouseLeave}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-7 pt-7 pb-5 border-b-2 border-black">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-primary border-b-2 border-primary pb-0.5">Score Tracking</span>
                <h2 className="font-heading font-black uppercase text-2xl mt-1">Your Growth Over Time</h2>
                <p className="text-sm text-muted-foreground font-medium mt-0.5">Enter any GitHub username to visualize their score history</p>
              </div>
              {overallChange !== null && (
                <div
                  className="flex items-center gap-2 border-2 border-black px-4 py-2 shadow-[3px_3px_0_#000] flex-shrink-0"
                  style={{ backgroundColor: overallChange > 0 ? "#bbf7d0" : overallChange < 0 ? "#fecaca" : "#e5e5e5" }}
                >
                  {overallChange > 0 ? <TrendingUp className="w-5 h-5" /> : overallChange < 0 ? <TrendingDown className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
                  <span className="font-black text-lg">Overall Change: {overallChange > 0 ? "+" : ""}{overallChange} points</span>
                </div>
              )}
            </div>

            <div className="px-7 pb-7">
              <div className="flex gap-3 mt-5 mb-6">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleTrendSearch()}
                    placeholder="GitHub username (e.g. torvalds)"
                    className="w-full border-2 border-black px-4 py-3 font-semibold bg-background focus:outline-none focus:border-primary placeholder:text-muted-foreground/60 pr-12"
                  />
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
                <button
                  onClick={handleTrendSearch}
                  disabled={!inputValue.trim()}
                  className="border-2 border-black bg-primary px-6 py-3 font-black uppercase tracking-wide shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Track
                </button>
              </div>

              <ScoreTrendChart
                trendData={trendData}
                isLoading={trendLoading}
                username={trendUsername}
                onAnalyze={(user) => setLocation(`/analyze/${user}`)}
                scoreColor={scoreColor}
                CustomTrendTooltip={CustomTrendTooltip}
                CustomLatestDot={CustomLatestDot}
              />
            </div>
          </div>

          {/* Recent Analyses */}
          <div className="reveal border-4 border-black bg-white p-7 shadow-[6px_6px_0_#000]">
            <h2 className="font-heading font-black uppercase text-xl mb-5 border-b-2 border-black pb-2">Recent Analyses</h2>

            {histLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 border-2 border-black bg-gray-50 animate-pulse" />
                ))}
              </div>
            ) : !history || history.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-black">
                <p className="font-heading font-bold text-xl uppercase mb-4">No analyses yet</p>
                <p className="text-muted-foreground font-medium mb-6">Be the first to analyze a GitHub profile</p>
                <button
                  onClick={() => setLocation("/")}
                  className="border-2 border-black bg-primary px-6 py-3 font-bold uppercase shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] hover:-translate-y-0.5 transition-all"
                >
                  Analyze Now
                </button>
              </div>
            ) : (
              <div ref={tableRef} className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-black">
                      <th className="text-left py-3 px-3 font-heading font-bold uppercase text-sm">User</th>
                      <th className="text-left py-3 px-3 font-heading font-bold uppercase text-sm">Score</th>
                      <th className="text-left py-3 px-3 font-heading font-bold uppercase text-sm hidden md:table-cell">Verdict</th>
                      <th className="text-left py-3 px-3 font-heading font-bold uppercase text-sm hidden lg:table-cell">Top Languages</th>
                      <th className="text-left py-3 px-3 font-heading font-bold uppercase text-sm">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((item) => (
                      <tr
                        key={item.id}
                        className="table-row border-b border-black hover:bg-background cursor-pointer transition-colors group"
                        onClick={() => setLocation(`/analyze/${item.username}`)}
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            {item.avatarUrl && (
                              <img src={item.avatarUrl} alt={item.username} className="w-8 h-8 border-2 border-black" />
                            )}
                            <span className="font-bold group-hover:text-primary transition-colors">@{item.username}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className="font-heading font-black text-xl"
                            style={{ color: item.score >= 70 ? "#22c55e" : item.score >= 50 ? "#FF8D3F" : "#ef4444" }}
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
                                style={{ backgroundColor: LANG_COLORS[li % LANG_COLORS.length], color: li === 1 ? "#fff" : "#000" }}
                              >
                                {lang}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-sm text-muted-foreground font-medium">{timeAgo(item.analyzedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
