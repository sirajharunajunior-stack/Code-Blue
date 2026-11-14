import { Line, LineChart, ResponsiveContainer } from "recharts";

import { cx, formatVitalValue } from "../lib/format";
import type { Vital } from "../types";
import { StatusPill, toneForStatus } from "./StatusPill";

const RANGES: Record<Vital["key"], [number, number]> = {
  heart_rate: [40, 180],
  spo2: [80, 100],
  temperature_c: [34, 42],
  respiratory_rate: [4, 44],
};

const COLORS: Record<string, string> = {
  normal: "#247452",
  warning: "#94600f",
  critical: "#ad3434",
  sensor_error: "#94600f",
  no_signal: "#687771",
  inactive: "#687771",
  no_data: "#687771",
};

export function VitalCard({ vital }: { vital: Vital }) {
  const [min, max] = RANGES[vital.key];
  const fraction =
    vital.value === null
      ? 0
      : Math.min(1, Math.max(0, (vital.value - min) / (max - min)));
  const radius = 47;
  const circumference = 2 * Math.PI * radius;
  const color = COLORS[vital.status] ?? COLORS.normal;
  const tone = toneForStatus(vital.status);
  const series = vital.series.map((point) => ({
    value: point.value,
    label: new Date(point.t).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));
  const hasSeries = series.some((point) => point.value !== null);

  return (
    <article className="card animate-fade-up p-4 sm:p-5" aria-label={vital.label}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="eyebrow">{vital.label}</p>
          <p className="mt-1 text-[11px] text-muted">{vital.expected}</p>
        </div>
        <StatusPill status={vital.status} label={vital.status_label} />
      </div>

      <div className="mt-3 flex items-center gap-4">
        <div className="relative h-[7.2rem] w-[7.2rem] shrink-0">
          <svg
            viewBox="0 0 120 120"
            className="h-full w-full -rotate-90"
            aria-hidden="true"
          >
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="#edf2ef"
              strokeWidth="8"
            />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - fraction)}
              className="transition-[stroke-dashoffset] duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="numeric text-3xl font-semibold leading-none text-ink">
              {formatVitalValue(vital.value)}
            </span>
            <span className="mt-1.5 text-[10px] font-semibold text-muted">
              {vital.unit}
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="h-12">
            {hasSeries ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={series}
                  margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
                >
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-end">
                <div className="h-px w-full bg-line" />
              </div>
            )}
          </div>
          <div className="mt-2 flex items-start gap-2">
            <span
              className={cx(
                "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                tone === "good" && "bg-good",
                tone === "warn" && "bg-warn",
                tone === "crit" && "bg-crit",
                (tone === "dim" || tone === "brand") && "bg-dim",
              )}
              aria-hidden="true"
            />
            <p className="min-w-0 text-[10px] leading-snug text-muted">
              {vital.baseline.ready
                ? `Baseline ${formatVitalValue(vital.baseline.mean)} ${vital.unit}`
                : "Learning baseline"}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
