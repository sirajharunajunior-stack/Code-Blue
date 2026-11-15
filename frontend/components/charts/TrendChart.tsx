"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatClock, formatDay, formatNumber } from "@/lib/health/format";
import { LEVELS } from "@/lib/health/levels";
import type { HealthLevel, MetricDef, Reading } from "@/types";

interface Point {
  ts: number;
  value: number;
  level: HealthLevel;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: { payload?: Point }[];
  metric: MetricDef;
  rangeHours: number;
}

function ChartTooltip({ active, payload, metric, rangeHours }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  const meta = LEVELS[point.level];

  return (
    <div className="rounded-md border border-edge bg-void/95 px-2.5 py-1.5 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.9)]">
      <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-dim">
        {rangeHours > 48 ? `${formatDay(point.ts)} · ${formatClock(point.ts)}Z` : `${formatClock(point.ts)}Z`}
      </div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="num text-[15px] text-ink">{formatNumber(point.value, metric.precision)}</span>
        <span className="font-mono text-[10px] text-mute">{metric.unit}</span>
      </div>
      <div className={`mt-0.5 font-mono text-[9px] uppercase tracking-[0.12em] ${meta.text}`}>
        {meta.label}
      </div>
    </div>
  );
}

/** Primary trend visualisation: one metric over a selectable window. */
export function TrendChart({
  readings,
  metric,
  rangeHours,
  height = 260,
}: {
  readings: Reading[];
  metric: MetricDef;
  rangeHours: number;
  height?: number;
}) {
  const data: Point[] = readings.map((r) => ({ ts: r.ts, value: r.value, level: r.level }));

  if (!data.length) {
    return (
      <div
        style={{ height }}
        className="grid place-items-center rounded-md border border-dashed border-line/70 bg-deep/20 px-4 text-center"
      >
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-dim">No instrument series</p>
          <p className="mt-1 text-[10.5px] text-mute">
            No {metric.label.toLowerCase()} readings are recorded for this subject in the selected window.
          </p>
        </div>
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const bounds = [metric.normalLo, metric.normalHi, metric.warnLow, metric.warnHigh]
    .filter((v): v is number => typeof v === "number");
  const rawMin = Math.min(...values, ...bounds);
  const rawMax = Math.max(...values, ...bounds);
  const pad = (rawMax - rawMin || 1) * 0.12;
  const domain: [number, number] = [
    Number((rawMin - pad).toFixed(2)),
    Number((rawMax + pad).toFixed(2)),
  ];

  const normalLo = metric.normalLo;
  const normalHi = metric.normalHi;

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 10, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id={`fill-${metric.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4ff0e4" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#4ff0e4" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="#12283a" strokeDasharray="2 4" vertical={false} />

          {normalLo !== null && normalHi !== null && (
            <ReferenceArea
              y1={normalLo}
              y2={normalHi}
              fill="#35d07f"
              fillOpacity={0.055}
              stroke="none"
              ifOverflow="visible"
            />
          )}

          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(ts: number) => (rangeHours > 48 ? formatDay(ts) : formatClock(ts))}
            tick={{ fill: "#4f6878", fontSize: 9, fontFamily: "var(--font-mono)" }}
            axisLine={{ stroke: "#12283a" }}
            tickLine={false}
            minTickGap={28}
            height={22}
          />
          <YAxis
            domain={domain}
            tickFormatter={(value: number) => formatNumber(value, metric.precision === 1 ? 1 : 0)}
            tick={{ fill: "#4f6878", fontSize: 9, fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
            width={46}
          />
          <Tooltip
            cursor={{ stroke: "#4ff0e4", strokeWidth: 1, strokeDasharray: "3 3" }}
            content={<ChartTooltip metric={metric} rangeHours={rangeHours} />}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#4ff0e4"
            strokeWidth={1.6}
            fill={`url(#fill-${metric.id})`}
            dot={false}
            activeDot={{ r: 3, fill: "#4ff0e4", stroke: "#03060a", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Two-series daily comparison, e.g. sleep vs. target. */
export function DailyBars({
  data,
  series,
  height = 200,
  unit,
}: {
  data: { label: string; a: number | null; b?: number | null }[];
  series: { a: string; b?: string; colorA?: string; colorB?: string };
  height?: number;
  unit: string;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
          <CartesianGrid stroke="#12283a" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#4f6878", fontSize: 9, fontFamily: "var(--font-mono)" }}
            axisLine={{ stroke: "#12283a" }}
            tickLine={false}
            height={20}
          />
          <YAxis
            tick={{ fill: "#4f6878", fontSize: 9, fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
            width={54}
            unit={unit}
          />
          <Tooltip
            cursor={{ stroke: "#1b3f55", strokeWidth: 1 }}
            contentStyle={{
              background: "#03060a",
              border: "1px solid #1b3f55",
              borderRadius: 6,
              fontSize: 11,
              fontFamily: "var(--font-mono)",
            }}
            labelStyle={{ color: "#7b93a4", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.12em" }}
            itemStyle={{ color: "#e6f4fa" }}
          />
          <Area
            type="stepAfter"
            dataKey="a"
            name={series.a}
            stroke={series.colorA ?? "#4ff0e4"}
            fill={series.colorA ?? "#4ff0e4"}
            fillOpacity={0.14}
            strokeWidth={1.4}
            dot={{ r: 2, fill: series.colorA ?? "#4ff0e4", strokeWidth: 0 }}
            isAnimationActive={false}
          />
          {series.b && (
            <Area
              type="stepAfter"
              dataKey="b"
              name={series.b}
              stroke={series.colorB ?? "#8b9cff"}
              fill="none"
              strokeWidth={1.2}
              strokeDasharray="4 3"
              dot={false}
              isAnimationActive={false}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
