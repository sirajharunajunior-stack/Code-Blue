import type { MetricDef } from "@/types";

/** Fixed precision, tabular numbers. */
export function formatNumber(value: number | null | undefined, precision = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toFixed(precision);
}

/** Value plus unit, e.g. "62 bpm" — never renders a bare number. */
export function formatMetricValue(
  metric: Pick<MetricDef, "precision" | "unit">,
  value: number | null | undefined,
) {
  const n = formatNumber(value, metric.precision);
  if (n === "—") return n;
  return `${n} ${metric.unit}`.trim();
}

/** Signed delta with an explicit sign, e.g. "+3 bpm". */
export function formatDelta(delta: number, precision = 0, unit = "") {
  const sign = delta > 0 ? "+" : delta < 0 ? "−" : "±";
  return `${sign}${formatNumber(Math.abs(delta), precision)}${unit ? ` ${unit}` : ""}`;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** UTC clock — deterministic on server and client, so hydration never mismatches. */
export function formatClock(ts: number): string {
  const d = new Date(ts * 1000);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export function formatClockSeconds(ts: number): string {
  const d = new Date(ts * 1000);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

export function formatDay(ts: number): string {
  const d = new Date(ts * 1000);
  return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}`;
}

export function formatDateTime(ts: number): string {
  return `${formatDay(ts)} · ${formatClock(ts)}Z`;
}

/** "12m ago", "3h ago", "2d ago" — measured against the mission clock, not the wall clock. */
export function formatRelative(ts: number, now: number): string {
  const diff = Math.max(0, now - ts);
  if (diff < 60) return "just now";
  const minutes = Math.floor(diff / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;
  return formatDay(ts);
}

/** Mission elapsed time: "214d 06:11". */
export function formatMissionElapsed(elapsedSeconds: number): string {
  const days = Math.floor(elapsedSeconds / 86400);
  const hours = Math.floor((elapsedSeconds % 86400) / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  return `${days}d ${pad(hours)}:${pad(minutes)}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function formatPercent(value: number, precision = 0) {
  return `${formatNumber(value, precision)}%`;
}

/** "78.4M km" style distance. */
export function formatDistanceKm(km: number): string {
  if (km >= 1_000_000) return `${(km / 1_000_000).toFixed(1)}M km`;
  if (km >= 1_000) return `${Math.round(km / 1_000)}k km`;
  return `${Math.round(km)} km`;
}

/** Turn seconds of one-way light time into a readable figure. */
export function formatLightDelay(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${pad(s)}s` : `${s}s`;
}

export function pluralise(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}
