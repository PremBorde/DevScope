import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  useGetAnalysisHistory,
  useGetPlatformStats,
  getGetAnalysisHistoryQueryKey,
  getGetPlatformStatsQueryKey,
} from "@workspace/api-client-react";
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
import { Users, Activity, TrendingUp, Clock } from "lucide-react";

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

export default function Dashboard() {
  const [, setLocation] = useLocation();

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

  const langBarData = stats?.topLanguages?.slice(0, 8).map((lang, i) => ({
    name: lang,
    value: history?.filter((h) => h.topLanguages.includes(lang)).length ?? 0,
    fill: LANG_COLORS[i % LANG_COLORS.length],
  })) ?? [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full min-h-screen bg-background"
    >
      <div className="border-b-4 border-black px-6 py-6 bg-background">
        <h1 className="font-heading font-black text-4xl uppercase">Dashboard</h1>
        <p className="text-muted-foreground font-medium mt-1">Platform-wide analytics and recent analyses</p>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8">
        {/* Platform Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Total Analyses",
              value: stats?.totalAnalyses ?? 0,
              icon: <Activity className="w-5 h-5" />,
              rotation: "-1deg",
              bg: "bg-primary",
            },
            {
              label: "Unique Users",
              value: stats?.uniqueUsers ?? 0,
              icon: <Users className="w-5 h-5" />,
              rotation: "0.8deg",
              bg: "bg-white",
            },
            {
              label: "Avg Score",
              value: stats ? `${stats.avgScore}` : "0",
              icon: <TrendingUp className="w-5 h-5" />,
              rotation: "-0.5deg",
              bg: "bg-white",
            },
            {
              label: "Recent Analyses",
              value: history?.length ?? 0,
              icon: <Clock className="w-5 h-5" />,
              rotation: "1deg",
              bg: "bg-white",
            },
          ].map(({ label, value, icon, rotation, bg }, i) => (
            <motion.div
              key={label}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className={`border-4 border-black p-5 shadow-[5px_5px_0_#000] ${bg}`}
              style={{ transform: `rotate(${rotation})` }}
            >
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                {icon}
                <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
              </div>
              <p className="font-heading font-black text-3xl">
                {statsLoading ? "..." : value}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Languages */}
          <div className="border-4 border-black bg-white p-6 shadow-[6px_6px_0_#000]">
            <h2 className="font-heading font-black uppercase text-xl mb-4 border-b-2 border-black pb-2">Top Languages</h2>
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

          {/* Hiring Breakdown */}
          <div className="border-4 border-black bg-white p-6 shadow-[6px_6px_0_#000]">
            <h2 className="font-heading font-black uppercase text-xl mb-4 border-b-2 border-black pb-2">Hiring Breakdown</h2>
            {hiringData.some((d) => d.value > 0) ? (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="60%" height={180}>
                  <PieChart>
                    <Pie
                      data={hiringData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
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
                <div className="space-y-2">
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

        {/* Recent Analyses */}
        <div className="border-4 border-black bg-white p-6 shadow-[6px_6px_0_#000]">
          <h2 className="font-heading font-black uppercase text-xl mb-4 border-b-2 border-black pb-2">Recent Analyses</h2>

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
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="text-left py-2 px-3 font-heading font-bold uppercase text-sm">User</th>
                    <th className="text-left py-2 px-3 font-heading font-bold uppercase text-sm">Score</th>
                    <th className="text-left py-2 px-3 font-heading font-bold uppercase text-sm hidden md:table-cell">Verdict</th>
                    <th className="text-left py-2 px-3 font-heading font-bold uppercase text-sm hidden lg:table-cell">Top Languages</th>
                    <th className="text-left py-2 px-3 font-heading font-bold uppercase text-sm">When</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item, i) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="border-b border-black hover:bg-background cursor-pointer transition-colors group"
                      onClick={() => setLocation(`/analyze/${item.username}`)}
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          {item.avatarUrl && (
                            <img
                              src={item.avatarUrl}
                              alt={item.username}
                              className="w-8 h-8 border-2 border-black"
                            />
                          )}
                          <span className="font-bold group-hover:text-primary transition-colors">@{item.username}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className="font-heading font-black text-xl"
                          style={{
                            color:
                              item.score >= 70 ? "#22c55e" : item.score >= 50 ? "#FF8D3F" : "#ef4444",
                          }}
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
                                backgroundColor: LANG_COLORS[li % LANG_COLORS.length],
                                color: li === 1 ? "#fff" : "#000",
                              }}
                            >
                              {lang}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-sm text-muted-foreground font-medium">
                        {timeAgo(item.analyzedAt)}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
