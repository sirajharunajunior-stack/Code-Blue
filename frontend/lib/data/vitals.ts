import readingsJson from "@/lib/data/readings.json";
import dailyJson from "@/lib/data/daily.json";
import alertsJson from "@/lib/data/alerts.json";
import { CAREER_LIMIT_MSV, RAW_METRICS } from "@/lib/data/reference";
import { getMetric, METRICS, PRIMARY_VITAL_IDS } from "@/lib/data/metrics";
import { getSubject } from "@/lib/data/subjects";
import { classify, worstLevel } from "@/lib/health/levels";
import type {
  AlertRecord,
  DailyRecord,
  HealthLevel,
  LatestReading,
  Reading,
} from "@/types";

type RawReadings = Record<string, Record<string, [number, number, HealthLevel][]>>;
type RawDaily = Record<
  string,
  {
    day: number;
    ts: number;
    sleep_hours: number | null;
    exercise_hours: number | null;
    radiation: number | null;
    cumulative_radiation: number | null;
    levels: { sleep_hours: HealthLevel; exercise_hours: HealthLevel; radiation: HealthLevel };
  }[]
>;
type RawAlert = {
  id: number;
  subject: string;
  ts: number;
  metric: string;
  value: number;
  level: HealthLevel;
  source: string;
  msg: string;
};

const READINGS = readingsJson as unknown as RawReadings;
const DAILY = dailyJson as unknown as RawDaily;
const ALERTS = alertsJson as unknown as RawAlert[];

/* ------------------------------------------------------------------ clock */

const ALL_TIMESTAMPS: number[] = Object.entries(READINGS)
  .filter(([subjectId]) => subjectId !== "local")
  .flatMap(([, byMetric]) =>
    Object.values(byMetric).flatMap((points) => points.map((p) => p[0])),
  );

/**
 * The newest timestamp in the demonstration dataset. Every "now" in the UI is
 * relative to this, so the mission clock and the readings stay coherent even
 * though the snapshot was exported on a different day.
 */
export const DEMO_NOW = ALL_TIMESTAMPS.length ? Math.max(...ALL_TIMESTAMPS) : 1795218300;

export const DEMO_START = ALL_TIMESTAMPS.length ? Math.min(...ALL_TIMESTAMPS) : DEMO_NOW - 604800;

/* --------------------------------------------------------------- readings */

export function getReadings(subjectId: string, metricId: string): Reading[] {
  const points = READINGS[subjectId]?.[metricId];
  if (!points) return [];
  return points.map(([ts, value, level]) => ({ ts, value, level }));
}

/** Readings inside the trailing window that ends at the newest reading. */
export function getReadingsInWindow(subjectId: string, metricId: string, hours: number): Reading[] {
  const all = getReadings(subjectId, metricId);
  if (!all.length) return [];
  const newest = all[all.length - 1].ts;
  const cutoff = newest - hours * 3600;
  return all.filter((r) => r.ts >= cutoff);
}

export function getLatestFor(subjectId: string, metricId: string): LatestReading | null {
  const series = getReadings(subjectId, metricId);
  if (!series.length) return null;
  const last = series[series.length - 1];
  return { ...last, metric: getMetric(metricId) };
}

/** Newest reading of every primary vital the subject actually has. */
export function getLatestVitals(subjectId: string): LatestReading[] {
  return PRIMARY_VITAL_IDS.flatMap((id) => {
    const latest = getLatestFor(subjectId, id);
    return latest ? [latest] : [];
  });
}

/**
 * Newest value of a metric whatever channel it arrives on.
 *
 * Vitals come from the reading stream; sleep, exercise and radiation live in the
 * daily table; assessment-only metrics (mood, glucose, …) have no instrument
 * value and return null. UI panels use this so a daily metric is never shown as
 * "not recorded" just because it is not in the vital stream.
 */
export function getLatestMetric(subjectId: string, metricId: string): LatestReading | null {
  const metric = METRICS[metricId];
  if (!metric) return null;

  if (metric.kind === "vital") return getLatestFor(subjectId, metricId);

  if (metric.kind === "daily") {
    const daily = getDaily(subjectId);
    const last = daily[daily.length - 1];
    if (!last) return null;

    const value =
      metricId === "sleep_hours"
        ? last.sleepHours
        : metricId === "exercise_hours"
          ? last.exerciseHours
          : metricId === "radiation"
            ? last.radiation
            : null;
    if (value === null) return null;

    const level =
      metricId === "sleep_hours"
        ? last.levels.sleep
        : metricId === "exercise_hours"
          ? last.levels.exercise
          : last.levels.radiation;

    return { ts: last.ts, value, level, metric };
  }

  return null;
}

/** Newest reading of *every* vital, worst level first. */
export function getLatestAll(subjectId: string): LatestReading[] {
  return Object.values(METRICS)
    .filter((m) => m.kind === "vital")
    .flatMap((m) => {
      const latest = getLatestFor(subjectId, m.id);
      return latest ? [latest] : [];
    })
    .sort((a, b) => a.metric.id.localeCompare(b.metric.id));
}

export function getOverallLevel(subjectId: string): HealthLevel {
  return worstLevel(getLatestAll(subjectId).map((r) => r.level));
}

export function getFlagged(subjectId: string): LatestReading[] {
  return getLatestAll(subjectId).filter((r) => r.level !== "normal");
}

/** Change against the reading roughly `hours` earlier. Null when the series does not reach that far back. */
export function getDelta(subjectId: string, metricId: string, hours = 24): number | null {
  const series = getReadings(subjectId, metricId);
  if (series.length < 2) return null;
  const last = series[series.length - 1];
  const target = last.ts - hours * 3600;
  let prior: Reading | null = null;
  for (const r of series) {
    if (r.ts <= target) prior = r;
    else break;
  }
  if (!prior || prior.ts === last.ts) return null;
  return last.value - prior.value;
}

/* ----------------------------------------------------------------- daily */

export function getDaily(subjectId: string): DailyRecord[] {
  const rows = DAILY[subjectId];
  if (!rows) return [];
  return rows.map((r) => ({
    day: r.day,
    ts: r.ts,
    sleepHours: r.sleep_hours,
    exerciseHours: r.exercise_hours,
    radiation: r.radiation,
    cumulativeRadiation: r.cumulative_radiation,
    levels: {
      sleep: r.levels.sleep_hours,
      exercise: r.levels.exercise_hours,
      radiation: r.levels.radiation,
    },
  }));
}

export interface RadiationSummary {
  cumulative: number;
  limit: number;
  remaining: number;
  percentOfLimit: number;
  avgDaily: number | null;
  projectedDaysToLimit: number | null;
  environmentMax: number;
  baseline: number | null;
  spikeThreshold: number | null;
  levelToday: HealthLevel;
  daily: DailyRecord[];
}

/** Radiation rule configuration, read from the exported database rules. */
function radiationRules(): {
  maxByEnvironment: Record<string, number>;
  spikeMultiple: number;
} {
  const raw = RAW_METRICS.find((metric) => metric.name === "radiation");
  let extra: Record<string, unknown> = {};
  try {
    extra = (JSON.parse(raw?.extra ?? "{}") as Record<string, unknown>) ?? {};
  } catch {
    extra = {};
  }
  const maxByEnvironment =
    (extra.max_by_environment as Record<string, number> | undefined) ?? {};
  const spikeMultiple =
    typeof extra.spike_multiple_of_baseline === "number"
      ? extra.spike_multiple_of_baseline
      : 2;
  return { maxByEnvironment, spikeMultiple };
}

/** Mirrors `/api/radiation` in the backend, including environment-specific limits. */
export function getRadiationSummary(subjectId: string): RadiationSummary {
  const daily = getDaily(subjectId);
  const doses = daily.map((d) => d.radiation).filter((d): d is number => d !== null);
  const cumulative = daily.length ? (daily[daily.length - 1].cumulativeRadiation ?? 0) : 0;
  const recent = doses.slice(-7);
  const avgDaily = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : null;
  const remaining = Math.max(0, CAREER_LIMIT_MSV - cumulative);
  const sorted = [...doses].sort((a, b) => a - b);
  const baseline = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
  const last = daily[daily.length - 1];
  const rules = radiationRules();
  const environment = getSubject(subjectId).environment;
  const environmentMax =
    rules.maxByEnvironment[environment] ?? getMetric("radiation").normalHi ?? 1.3;

  return {
    cumulative,
    limit: CAREER_LIMIT_MSV,
    remaining,
    percentOfLimit: CAREER_LIMIT_MSV ? (cumulative / CAREER_LIMIT_MSV) * 100 : 0,
    avgDaily,
    projectedDaysToLimit: avgDaily ? Math.round(remaining / avgDaily) : null,
    environmentMax,
    baseline,
    spikeThreshold: baseline ? baseline * rules.spikeMultiple : null,
    levelToday: last ? last.levels.radiation : "normal",
    daily,
  };
}

/* ---------------------------------------------------------------- alerts */

const ALERT_SOURCE: Record<string, AlertRecord["source"]> = {
  dataset: "dataset",
  baseline: "baseline",
  rule: "rule",
  sensor: "sensor",
};

export function getAlerts(subjectId?: string, limit = 6): AlertRecord[] {
  return ALERTS.filter((a) => !subjectId || a.subject === subjectId)
    .slice(0, limit)
    .map((a) => ({
      id: a.id,
      subject: a.subject,
      ts: a.ts,
      metric: a.metric,
      value: a.value,
      level: a.level,
      source: ALERT_SOURCE[a.source] ?? "rule",
      message: a.msg,
    }));
}

export function getAlertCount(subjectId?: string): number {
  return ALERTS.filter((a) => !subjectId || a.subject === subjectId).length;
}

/* -------------------------------------------------------------- summaries */

export interface SubjectSummary {
  overall: HealthLevel;
  flagged: LatestReading[];
  latest: LatestReading[];
  lastReadingAt: number | null;
  coverage: number;
}

export function getSubjectSummary(subjectId: string): SubjectSummary {
  const latest = getLatestAll(subjectId);
  const lastReadingAt = latest.length ? Math.max(...latest.map((r) => r.ts)) : null;
  return {
    overall: worstLevel(latest.map((r) => r.level)),
    flagged: latest.filter((r) => r.level !== "normal"),
    latest,
    lastReadingAt,
    coverage: latest.length / Object.values(METRICS).filter((m) => m.kind === "vital").length,
  };
}

/**
 * Classify a value the astronaut just typed. Used by assessments and manual
 * entry so an entered value gets the same level the backend would assign.
 */
export function classifyValue(metricId: string, value: number): HealthLevel | null {
  const metric = METRICS[metricId];
  return metric ? classify(metric, value) : null;
}
