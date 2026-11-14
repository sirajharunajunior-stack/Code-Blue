import type { HealthLevel, MetricDef } from "@/types";

export const LEVEL_ORDER: HealthLevel[] = [
  "normal",
  "slightly_abnormal",
  "needs_checkup",
  "critical",
];

export interface LevelMeta {
  label: string;
  short: string;
  meaning: string;
  action: string;
  /** Tailwind class fragments for text / border / surface. */
  text: string;
  border: string;
  surface: string;
  dot: string;
  /** Raw hex, for SVG strokes and chart fills. */
  hex: string;
  /** 0–3, used for sorting "worst first". */
  rank: number;
}

export const LEVELS: Record<HealthLevel, LevelMeta> = {
  normal: {
    label: "Normal",
    short: "OK",
    meaning: "Inside the configured healthy range",
    action: "No action needed",
    text: "text-aurora",
    border: "border-aurora/35",
    surface: "bg-aurora/10",
    dot: "bg-aurora",
    hex: "#35d07f",
    rank: 0,
  },
  slightly_abnormal: {
    label: "Slightly abnormal",
    short: "WATCH",
    meaning: "Outside the normal range but within tolerance",
    action: "Monitor and recheck",
    text: "text-amber",
    border: "border-amber/35",
    surface: "bg-amber/10",
    dot: "bg-amber",
    hex: "#f2c200",
    rank: 1,
  },
  needs_checkup: {
    label: "Needs check-up",
    short: "REVIEW",
    meaning: "Beyond the warning threshold",
    action: "Schedule a medical review",
    text: "text-orange",
    border: "border-orange/40",
    surface: "bg-orange/10",
    dot: "bg-orange",
    hex: "#f28c28",
    rank: 2,
  },
  critical: {
    label: "Critical",
    short: "CRIT",
    meaning: "Beyond the critical threshold",
    action: "Immediate medical attention",
    text: "text-danger",
    border: "border-danger/45",
    surface: "bg-danger/12",
    dot: "bg-danger",
    hex: "#ff4d5e",
    rank: 3,
  },
};

export function rankOf(level: HealthLevel | undefined | null): number {
  return level ? LEVELS[level].rank : 0;
}

/** Worst level in a set — mirrors `levels.worst()` in the backend. */
export function worstLevel(levels: (HealthLevel | null | undefined)[]): HealthLevel {
  return levels.reduce<HealthLevel>(
    (worst, level) => (rankOf(level) > rankOf(worst) ? (level as HealthLevel) : worst),
    "normal",
  );
}

export function isConcern(level: HealthLevel) {
  return level !== "normal";
}

/**
 * Classify a single value against a metric definition.
 * Deliberately identical to `levels.classify()` in the backend so a value shown
 * here and a value classified by the API can never disagree.
 */
export function classify(metric: MetricDef, value: number): HealthLevel {
  const below = (limit: number | null) => limit !== null && value < limit;
  const above = (limit: number | null) => limit !== null && value > limit;

  if (below(metric.critLow) || above(metric.critHigh)) return "critical";
  if (below(metric.warnLow) || above(metric.warnHigh)) return "needs_checkup";

  const twoSidedLow = metric.warnLow !== null || metric.critLow !== null;
  const twoSidedHigh = metric.warnHigh !== null || metric.critHigh !== null;

  if ((twoSidedLow && below(metric.normalLo)) || (twoSidedHigh && above(metric.normalHi))) {
    return "slightly_abnormal";
  }
  return "normal";
}

/** Percentage position of a value inside a range, clamped to 0–100. */
export function positionInRange(value: number, lo: number, hi: number) {
  if (hi === lo) return 0;
  return Math.min(100, Math.max(0, ((value - lo) / (hi - lo)) * 100));
}
