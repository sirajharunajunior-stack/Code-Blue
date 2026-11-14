import { LEVEL_RANGES, RAW_METRICS } from "@/lib/data/reference";
import type { BodySystemId, HealthLevel, MeasurementSource, MetricDef } from "@/types";

interface Presentation {
  label: string;
  short: string;
  unit?: string;
  precision: number;
  systems: BodySystemId[];
  description: string;
  source: MeasurementSource;
  /** Optional short axis label. */
  axis?: string;
}

/**
 * Presentation metadata for every metric defined in health.db.
 * Thresholds are *not* duplicated here — they are read from the database export
 * (`reference.json`) so the UI and the API always agree.
 */
const PRESENTATION: Record<string, Presentation> = {
  heart_rate: {
    label: "Heart rate",
    short: "Heart rate",
    unit: "bpm",
    precision: 0,
    systems: ["heart", "brain"],
    description: "Pulse rate. Rises with exertion, heat, stress and dehydration.",
    source: "dataset",
  },
  bp_systolic: {
    label: "Systolic pressure",
    short: "Systolic",
    unit: "mmHg",
    precision: 0,
    systems: ["heart", "brain"],
    description: "Peak arterial pressure during contraction of the heart.",
    source: "dataset",
  },
  bp_diastolic: {
    label: "Diastolic pressure",
    short: "Diastolic",
    unit: "mmHg",
    precision: 0,
    systems: ["heart", "brain"],
    description: "Resting arterial pressure between beats.",
    source: "dataset",
  },
  spo2: {
    label: "Oxygen saturation",
    short: "SpO₂",
    unit: "%",
    precision: 1,
    systems: ["lungs", "brain"],
    description: "Share of haemoglobin carrying oxygen. Sensitive to cabin pressure and fluid shifts.",
    source: "dataset",
  },
  resp_rate: {
    label: "Respiration rate",
    short: "Respiration",
    unit: "br/min",
    precision: 1,
    systems: ["lungs"],
    description: "Breaths per minute. A quiet early indicator of stress, illness or CO₂ exposure.",
    source: "dataset",
  },
  body_temp: {
    label: "Core temperature",
    short: "Temperature",
    unit: "°C",
    precision: 1,
    systems: ["brain"],
    description: "Deep-body temperature, typically measured at the tympanic membrane.",
    source: "dataset",
  },
  cabin_co2: {
    label: "Cabin CO₂",
    short: "Cabin CO₂",
    unit: "%",
    precision: 2,
    systems: ["lungs", "brain"],
    description: "Partial concentration in the habitat atmosphere — an environmental reading, not a body reading.",
    source: "sensor",
  },
  sleep_hours: {
    label: "Sleep",
    short: "Sleep",
    unit: "h",
    precision: 1,
    systems: ["brain"],
    description: "Total sleep per 24 h. Chronic restriction degrades attention and mood.",
    source: "dataset",
  },
  exercise_hours: {
    label: "Exercise",
    short: "Exercise",
    unit: "h/day",
    precision: 1,
    systems: ["muscles", "bones", "heart"],
    description: "Loaded exercise time per day — the primary countermeasure against bone and muscle loss.",
    source: "dataset",
  },
  radiation: {
    label: "Radiation dose",
    short: "Dose",
    unit: "mSv/day",
    precision: 2,
    systems: ["bones", "digestive", "brain"],
    description: "Daily ionising dose. The career ceiling is 600 mSv for this mission profile.",
    source: "sensor",
  },
};

function buildMetric(raw: (typeof RAW_METRICS)[number]): MetricDef {
  const p = PRESENTATION[raw.name];
  return {
    id: raw.name,
    label: p?.label ?? humanise(raw.name),
    short: p?.short ?? humanise(raw.name),
    unit: p?.unit ?? raw.unit,
    kind: raw.kind,
    source: p?.source ?? "dataset",
    normalLo: raw.normal_lo,
    normalHi: raw.normal_hi,
    warnLow: raw.warn_low,
    warnHigh: raw.warn_high,
    critLow: raw.crit_low,
    critHigh: raw.crit_high,
    precision: p?.precision ?? 1,
    systems: p?.systems ?? [],
    description: p?.description ?? "Configured health indicator.",
    rangeText: LEVEL_RANGES[raw.name],
  };
}

function humanise(id: string) {
  const s = id.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Indicators that are *not* in the health.db vital set. They are entered by the
 * crew during a guided assessment or self-reported, and the reference ranges
 * below are configured for this demonstration — they are not NASA clinical
 * thresholds and are labelled as such wherever they surface in the UI.
 */
const ASSESSMENT_METRICS: MetricDef[] = [
  {
    id: "blood_glucose",
    label: "Blood glucose",
    short: "Glucose",
    unit: "mg/dL",
    kind: "assessment",
    source: "manual",
    normalLo: 70,
    normalHi: 140,
    warnLow: 60,
    warnHigh: 180,
    critLow: 50,
    critHigh: 250,
    precision: 0,
    systems: ["digestive"],
    description: "Capillary glucose from a finger-stick reading taken with the crew glucometer.",
    rangeText: {
      normal: "70–140 mg/dL",
      slightly_abnormal: "141–180 or 61–69 mg/dL",
      needs_checkup: "181–250 or 50–59 mg/dL",
      critical: "above 250 or below 50 mg/dL",
    },
  },
  {
    id: "mood_score",
    label: "Mood",
    short: "Mood",
    unit: "/10",
    kind: "assessment",
    source: "self-report",
    normalLo: 6,
    normalHi: null,
    warnLow: 4,
    warnHigh: null,
    critLow: 2,
    critHigh: null,
    precision: 0,
    systems: ["brain"],
    description: "Self-reported mood today, where 10 is positive and 1 is very low.",
    rangeText: {
      normal: "6–10",
      slightly_abnormal: "4–5",
      needs_checkup: "2–3",
      critical: "1 or below",
    },
  },
  {
    id: "stress_score",
    label: "Stress",
    short: "Stress",
    unit: "/10",
    kind: "assessment",
    source: "self-report",
    normalLo: null,
    normalHi: 4,
    warnLow: null,
    warnHigh: 7,
    critLow: null,
    critHigh: 9,
    precision: 0,
    systems: ["brain"],
    description: "Self-reported stress load, where 10 is the highest level you have felt.",
    rangeText: {
      normal: "0–4",
      slightly_abnormal: "5–7",
      needs_checkup: "8–9",
      critical: "10",
    },
  },
  {
    id: "fatigue_score",
    label: "Fatigue",
    short: "Fatigue",
    unit: "/10",
    kind: "assessment",
    source: "self-report",
    normalLo: null,
    normalHi: 4,
    warnLow: null,
    warnHigh: 6,
    critLow: null,
    critHigh: 8,
    precision: 0,
    systems: ["brain", "muscles"],
    description: "Self-reported fatigue, where 10 means unable to complete routine tasks.",
    rangeText: {
      normal: "0–4",
      slightly_abnormal: "5–6",
      needs_checkup: "7–8",
      critical: "9–10",
    },
  },
  {
    id: "symptom_score",
    label: "Symptom severity",
    short: "Symptoms",
    unit: "/10",
    kind: "assessment",
    source: "self-report",
    normalLo: null,
    normalHi: 2,
    warnLow: null,
    warnHigh: 5,
    critLow: null,
    critHigh: 8,
    precision: 0,
    systems: ["brain"],
    description: "Worst symptom severity reported in this assessment.",
    rangeText: {
      normal: "0–2",
      slightly_abnormal: "3–5",
      needs_checkup: "6–8",
      critical: "9–10",
    },
  },
];

const REFERENCE_METRICS = RAW_METRICS.map(buildMetric);

export const METRICS: Record<string, MetricDef> = Object.fromEntries(
  [...REFERENCE_METRICS, ...ASSESSMENT_METRICS].map((m) => [m.id, m]),
);

/** Metrics that only exist inside a guided assessment. */
export const SELF_REPORTED = ASSESSMENT_METRICS;

export const VITALS = Object.values(METRICS).filter((m) => m.kind === "vital");
export const DAILY = Object.values(METRICS).filter((m) => m.kind === "daily");

/** Order used by the biometric grid. */
export const PRIMARY_VITAL_IDS = [
  "heart_rate",
  "bp_systolic",
  "spo2",
  "body_temp",
  "resp_rate",
  "cabin_co2",
] as const;

export const TRENDABLE_IDS = [
  "heart_rate",
  "bp_systolic",
  "bp_diastolic",
  "spo2",
  "body_temp",
  "resp_rate",
  "cabin_co2",
] as const;

export function getMetric(id: string): MetricDef {
  const metric = METRICS[id];
  if (!metric) throw new Error(`Unknown metric: ${id}`);
  return metric;
}

export function metricsForSystem(systemId: BodySystemId): MetricDef[] {
  return Object.values(METRICS).filter((m) => m.systems.includes(systemId));
}

/** Colour token per level, for charts. */
export const LEVEL_HEX: Record<HealthLevel, string> = {
  normal: "#35d07f",
  slightly_abnormal: "#f2c200",
  needs_checkup: "#f28c28",
  critical: "#ff4d5e",
};
