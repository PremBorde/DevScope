import { useRef, useState, useCallback } from "react";
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
  LineChart,
  Line,
  ReferenceDot,
} from "recharts";
import { Users, Activity, TrendingUp, Clock, Search, TrendingDown, Minus } from "lucide-react";
import {
  useStaggerEntrance,
  useScrollReveal,
  useCardHover,
} from "@/hooks/useAnimations";
import PageTransition from "@/components/layout/PageTransition";
import { usePageTitle } from "@/hooks/usePageTitle";

function HiringBadge({ rec }: { rec: string }) {
  const map: Record<string, { label: string; bg: string }> = {
    strong_hire: { label: "Strong Hire", bg: "bg-green-400" },
    hire: { label: "Hire", bg: "bg-blue-400" },
    consider: { label: "Consider", bg: "bg-yellow-300" },
    pass: { label: "Pass", bg: "bg-red-400" },
  };
  const style = map[rec] ?? map["consider"];
  return (
    <span className={`inline-block px-2 py-0.5 border border-black font-bold uppercase text-black text-xs ${style.bg}`}>
      {style.label}
    </span>
  );
}

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
  label?: string;
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
  const pageRef = useRef<HTMLDivElement>(null);
  const chartsRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const trendRef = useRef<HTMLDivElement>(null);

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

  const hiringData = stats
    ? Object.entries(stats.hiringBreakdown).map(([key, count]) => ({
        name: key.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        value: count,
        color: HIRE_COLORS[key],
      }))
    : [];

  const langBarData =
    stats?.topLanguages?.slice(0, 8).map((lang, i) => ({
      name: lang,
      value: history?.filter((h) => h.topLanguages.includes(lang)).length ?? 0,
      fill: LANG_COLORS[i % LANG_COLORS.length],
    })) ?? [];

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

  // Derived trend stats
  const overallChange = trendData && trendData.length >= 2
    ? trendData[trendData.length - 1].score - trendData[0].score
    : null;
  const latestScore = trendData && trendData.length > 0
    ? trendData[trendData.length - 1].score
    : null;
  const chartMin = trendData && trendData.length > 0
    ? Math.max(0, Math.min(...trendData.map((d) => d.score)) - 10)
    : 0;

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
                className={`stat-card border-4 border-black p-6 shadow-[5px_5px_0_#000] will-change-transform ${bg}`}
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
              className="chart-card border-4 border-black bg-white p-7 shadow-[6px_6px_0_#000] will-change-transform"
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
                    <Bar dataKey="value" radius={0} isAnimationActive animationBegin={400} animationDuration={900}>
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
              className="chart-card border-4 border-black bg-white p-7 shadow-[6px_6px_0_#000] will-change-transform"
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
                        animationBegin={300}
                        animationDuration={1000}
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
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-7 pt-7 pb-5 border-b-2 border-black">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-primary border-b-2 border-primary pb-0.5">Score Tracking</span>
                <h2 className="font-heading font-black uppercase text-2xl mt-1">Your Growth Over Time</h2>
                <p className="text-sm text-muted-foreground font-medium mt-0.5">Enter any GitHub username to visualize their score history</p>
              </div>
              {/* Change badge */}
              {overallChange !== null && (
                <div
                  className="flex items-center gap-2 border-2 border-black px-4 py-2 shadow-[3px_3px_0_#000] flex-shrink-0"
                  style={{ backgroundColor: overallChange > 0 ? "#bbf7d0" : overallChange < 0 ? "#fecaca" : "#e5e5e5" }}
                >
                  {overallChange > 0
                    ? <TrendingUp className="w-5 h-5" />
                    : overallChange < 0
                    ? <TrendingDown className="w-5 h-5" />
                    : <Minus className="w-5 h-5" />}
                  <span className="font-black text-lg">
                    Overall Change:{" "}
                    {overallChange > 0 ? "+" : ""}{overallChange} points
                  </span>
                </div>
              )}
            </div>

            <div className="px-7 pb-7">
              {/* Search row */}
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
                  className="border-2 border-black bg-primary px-6 py-3 font-black uppercase tracking-wide shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] hover:-translate-y-0.5 active:shadow-[2px_2px_0_#000] active:translate-y-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-[4px_4px_0_#000] disabled:hover:translate-y-0"
                >
                  Track
                </button>
              </div>

              {/* Chart area */}
              {!trendUsername ? (
                <div className="h-56 border-2 border-dashed border-black flex flex-col items-center justify-center gap-3">
                  <TrendingUp className="w-10 h-10 text-muted-foreground/40" />
                  <p className="font-bold text-muted-foreground uppercase tracking-wide text-sm">Enter a username to see their score trajectory</p>
                </div>
              ) : trendLoading ? (
                <div className="h-56 flex flex-col items-center justify-center gap-4">
                  <div className="w-8 h-8 border-4 border-black border-t-primary rounded-full animate-spin" />
                  <p className="font-bold uppercase tracking-wide text-sm text-muted-foreground">Loading trend for @{trendUsername}…</p>
                </div>
              ) : !trendData || trendData.length === 0 ? (
                <div className="h-56 border-2 border-dashed border-black flex flex-col items-center justify-center gap-3">
                  <p className="font-heading font-black text-xl uppercase">No data yet</p>
                  <p className="text-muted-foreground font-medium text-sm">
                    Analyze <span className="font-bold text-primary">@{trendUsername}</span> first to start tracking
                  </p>
                  <button
                    onClick={() => setLocation(`/analyze/${trendUsername}`)}
                    className="mt-2 border-2 border-black bg-primary px-5 py-2 font-bold uppercase text-sm shadow-[3px_3px_0_#000] hover:shadow-[5px_5px_0_#000] hover:-translate-y-0.5 transition-all"
                  >
                    Analyze Now →
                  </button>
                </div>
              ) : trendData.length === 1 ? (
                /* Single data point */
                <div className="h-56 border-2 border-dashed border-black flex flex-col items-center justify-center gap-3">
                  <p className="font-bold text-muted-foreground text-sm uppercase tracking-wide">Only one analysis found</p>
                  <div
                    className="border-4 border-black px-8 py-4 shadow-[4px_4px_0_#000] text-center"
                    style={{ backgroundColor: scoreColor(trendData[0].score) + "33" }}
                  >
                    <p className="font-heading font-black text-5xl" style={{ color: scoreColor(trendData[0].score) }}>
                      {trendData[0].score}
                    </p>
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-1">{trendData[0].date}</p>
                  </div>
                  <p className="text-muted-foreground font-medium text-sm">Re-analyze to track changes over time</p>
                </div>
              ) : (
                /* Full chart */
                <div>
                  {/* Stats row */}
                  <div className="flex items-center gap-6 mb-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Latest score</span>
                      <span
                        className="font-heading font-black text-2xl border-b-2"
                        style={{ color: scoreColor(latestScore!), borderColor: scoreColor(latestScore!) }}
                      >
                        {latestScore}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Analyses</span>
                      <span className="font-heading font-black text-2xl">{trendData.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">From</span>
                      <span className="font-bold text-sm">{trendData[0].date}</span>
                    </div>
                  </div>

                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={trendData} margin={{ top: 10, right: 24, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="scoreGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#FF8D3F" />
                          <stop offset="100%" stopColor="#22c55e" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" stroke="#e5e5e5" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fontWeight: 700 }}
                        tickFormatter={(d: string) => {
                          const [, m, day] = d.split("-");
                          return `${m}/${day}`;
                        }}
                      />
                      <YAxis
                        domain={[chartMin, 100]}
                        tick={{ fontSize: 11 }}
                        tickCount={6}
                      />
                      <Tooltip content={<CustomTrendTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="url(#scoreGradient)"
                        strokeWidth={3}
                        dot={(props) => (
                          <CustomLatestDot
                            key={props.index}
                            cx={props.cx}
                            cy={props.cy}
                            value={props.value}
                            index={props.index}
                            dataLength={trendData.length}
                          />
                        )}
                        activeDot={{ r: 6, stroke: "#000", strokeWidth: 2, fill: "#FF8D3F" }}
                        isAnimationActive
                        animationBegin={200}
                        animationDuration={1200}
                        animationEasing="ease-out"
                      />
                      {/* Reference dot on the latest point label */}
                      <ReferenceDot
                        x={trendData[trendData.length - 1].date}
                        y={trendData[trendData.length - 1].score}
                        r={0}
                        label={{
                          value: `${trendData[trendData.length - 1].score} ★`,
                          position: "top",
                          fontSize: 12,
                          fontWeight: 900,
                          fill: scoreColor(trendData[trendData.length - 1].score),
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Recent Analyses */}
          <div
            className="reveal border-4 border-black bg-white p-7 shadow-[6px_6px_0_#000]"
          >
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
                    {history.map((item, i) => (
                      <tr
                        key={item.id}
                        className="table-row border-b border-black hover:bg-background cursor-pointer transition-colors group will-change-transform"
                        onClick={() => setLocation(`/analyze/${item.username}`)}
                        style={{ opacity: 0 }}
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
