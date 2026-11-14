"use client";

import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatNumber } from "@/lib/health/format";

export interface RadiationPoint {
  label: string;
  daily: number;
  cumulative: number;
}

/**
 * Daily dose against the running cumulative total, with the career ceiling as a
 * hard reference line. The two scales answer different questions: "was today
 * unusual?" and "how much room is left?".
 */
export function RadiationChart({
  data,
  limit,
  height = 240,
}: {
  data: RadiationPoint[];
  limit: number;
  height?: number;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 6, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="radiation-cumulative" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b9cff" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#8b9cff" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#12283a" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#4f6878", fontSize: 9, fontFamily: "var(--font-mono)" }}
            axisLine={{ stroke: "#12283a" }}
            tickLine={false}
            height={20}
          />
          <YAxis
            yAxisId="daily"
            tick={{ fill: "#4f6878", fontSize: 9, fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
            width={44}
            domain={[0, (max: number) => Math.max(1, Math.ceil(max * 2.2))]}
          />
          <YAxis
            yAxisId="cumulative"
            orientation="right"
            tick={{ fill: "#4f6878", fontSize: 9, fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
            width={44}
            domain={[0, limit]}
          />
          <Tooltip
            contentStyle={{
              background: "#03060a",
              border: "1px solid #1b3f55",
              borderRadius: 6,
              fontSize: 11,
              fontFamily: "var(--font-mono)",
            }}
            labelStyle={{ color: "#7b93a4", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.12em" }}
            itemStyle={{ color: "#e6f4fa" }}
            formatter={(value, name) => [
              `${formatNumber(Number(value), 2)} mSv`,
              name === "daily" ? "Daily dose" : "Cumulative",
            ]}
          />
          <Legend
            verticalAlign="top"
            height={22}
            formatter={(value: string) => (
              <span style={{ color: "#7b93a4", fontSize: 9, fontFamily: "var(--font-mono)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                {value === "daily" ? "Daily dose" : "Cumulative"}
              </span>
            )}
          />
          <ReferenceLine
            yAxisId="cumulative"
            y={limit}
            stroke="#ff4d5e"
            strokeDasharray="4 4"
            label={{
              value: `${limit} mSv ceiling`,
              position: "insideTopRight",
              fill: "#ff4d5e",
              fontSize: 9,
              fontFamily: "var(--font-mono)",
            }}
          />
          <Bar
            yAxisId="daily"
            dataKey="daily"
            fill="#1b8f8a"
            fillOpacity={0.55}
            radius={[2, 2, 0, 0]}
            maxBarSize={18}
            isAnimationActive={false}
          />
          <Area
            yAxisId="cumulative"
            type="monotone"
            dataKey="cumulative"
            stroke="#8b9cff"
            strokeWidth={1.5}
            fill="url(#radiation-cumulative)"
            dot={{ r: 2, fill: "#8b9cff", strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
