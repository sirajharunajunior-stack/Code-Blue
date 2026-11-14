import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatVitalValue } from "../lib/format";
import type { HistoryPoint, Vital } from "../types";
import { StatusPill } from "./StatusPill";

const COLORS: Record<string, string> = {
  normal: "#247452",
  warning: "#94600f",
  critical: "#ad3434",
  sensor_error: "#94600f",
  no_signal: "#687771",
  inactive: "#687771",
  no_data: "#687771",
};

export function TrendChart({
  vital,
  history,
}: {
  vital: Vital;
  history: HistoryPoint[];
}) {
  const data = history.map((row) => ({
    time: new Date(row.recorded_at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    value: row[vital.key],
  }));
  const color = COLORS[vital.status] ?? COLORS.normal;

  return (
    <article className="card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{vital.label}</p>
          <p className="mt-1 text-[11px] text-muted">
            {vital.baseline.ready
              ? `Personal baseline ${formatVitalValue(vital.baseline.mean)} ${vital.unit}`
              : "Baseline learning"}
          </p>
        </div>
        <div className="text-right">
          <p>
            <span className="numeric text-2xl font-semibold text-ink">
              {formatVitalValue(vital.value)}
            </span>{" "}
            <span className="text-[11px] text-muted">{vital.unit}</span>
          </p>
          <StatusPill
            className="mt-1.5"
            status={vital.status}
            label={vital.status_label}
          />
        </div>
      </div>

      <div className="mt-4 h-44 w-full" aria-label={`${vital.label} recent trend`}>
        {data.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#ebf1ed" />
              <XAxis
                dataKey="time"
                minTickGap={32}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "#657a73" }}
              />
              <YAxis
                domain={["auto", "auto"]}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "#657a73" }}
                width={52}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #dce7e0",
                  fontSize: 12,
                  boxShadow: "0 12px 28px -20px rgba(20, 53, 46, 0.6)",
                }}
                labelStyle={{ color: "#657a73", fontSize: 10 }}
              />
              {vital.baseline.ready && (
                <ReferenceLine
                  y={vital.baseline.mean}
                  stroke="#b9cbc2"
                  strokeDasharray="4 4"
                />
              )}
              <Line
                type="monotone"
                dataKey="value"
                name={vital.label}
                stroke={color}
                strokeWidth={2.2}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted">
            Collecting readings…
          </div>
        )}
      </div>
    </article>
  );
}
