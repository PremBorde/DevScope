import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts";
import { TrendingUp } from "lucide-react";
import type { ScoreTrendPoint } from "@workspace/api-client-react";

interface ScoreTrendChartProps {
  trendData: ScoreTrendPoint[] | undefined;
  isLoading: boolean;
  username: string;
  onAnalyze: (username: string) => void;
  scoreColor: (score: number) => string;
  CustomTrendTooltip: React.ComponentType<any>;
  CustomLatestDot: React.ComponentType<any>;
}

export function ScoreTrendChart({
  trendData,
  isLoading,
  username,
  onAnalyze,
  scoreColor,
  CustomTrendTooltip,
  CustomLatestDot,
}: ScoreTrendChartProps) {
  if (!username) {
    return (
      <div className="h-56 border-2 border-dashed border-black flex flex-col items-center justify-center gap-3">
        <TrendingUp className="w-10 h-10 text-muted-foreground/40" />
        <p className="font-bold text-muted-foreground uppercase tracking-wide text-sm">Enter a username to see their score trajectory</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-56 flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 border-4 border-black border-t-primary rounded-full animate-spin" />
        <p className="font-bold uppercase tracking-wide text-sm text-muted-foreground">Loading trend for @{username}…</p>
      </div>
    );
  }

  if (!trendData || trendData.length === 0) {
    return (
      <div className="h-56 border-2 border-dashed border-black flex flex-col items-center justify-center gap-3">
        <p className="font-heading font-black text-xl uppercase">No data yet</p>
        <p className="text-muted-foreground font-medium text-sm">
          Analyze <span className="font-bold text-primary">@{username}</span> first to start tracking
        </p>
        <button
          onClick={() => onAnalyze(username)}
          className="mt-2 border-2 border-black bg-primary px-5 py-2 font-bold uppercase text-sm shadow-[3px_3px_0_#000] hover:shadow-[5px_5px_0_#000] hover:-translate-y-0.5 transition-all"
        >
          Analyze Now →
        </button>
      </div>
    );
  }

  if (trendData.length === 1) {
    return (
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
    );
  }

  const latestScore = trendData[trendData.length - 1].score;
  const chartMin = Math.max(0, Math.min(...trendData.map((d) => d.score)) - 10);

  return (
    <div>
      <div className="flex items-center gap-6 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Latest score</span>
          <span
            className="font-heading font-black text-2xl border-b-2"
            style={{ color: scoreColor(latestScore), borderColor: scoreColor(latestScore) }}
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
              const parts = d.split("-");
              return parts.length >= 3 ? `${parts[1]}/${parts[2]}` : d;
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
          />
          <ReferenceDot
            x={trendData[trendData.length - 1].date}
            y={latestScore}
            r={0}
            label={{
              value: `${latestScore} ★`,
              position: "top",
              fontSize: 12,
              fontWeight: 900,
              fill: scoreColor(latestScore),
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
