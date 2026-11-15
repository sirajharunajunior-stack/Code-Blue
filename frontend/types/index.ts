/**
 * ASTRA domain types.
 *
 * These mirror the FastAPI backend in the repository root
 * (`/api/levels`, `/api/limits`, `/api/latest`, `/api/history`, `/api/daily`,
 * `/api/radiation`, `/api/alerts`) so the demonstration data layer can be
 * replaced by live API responses without touching the UI.
 */

/* ------------------------------------------------------------------ health */

/** Four levels, best to worst — identical to `levels.py` / the `levels` table. */
export type HealthLevel = "normal" | "slightly_abnormal" | "needs_checkup" | "critical";

/** Where a value came from. The UI must never blur these together. */
export type MeasurementSource =
  | "sensor" // read automatically from cabin / body sensors
  | "dataset" // recorded by the monitoring system (demo snapshot)
  | "self-report" // typed in by the astronaut
  | "manual"; // measured with equipment, then entered by hand

export type MetricKind = "vital" | "daily" | "assessment";

export type BodySystemId =
  | "brain"
  | "eyes"
  | "heart"
  | "lungs"
  | "digestive"
  | "bones"
  | "muscles";

export interface MetricDef {
  id: string;
  /** Full name shown in panels and tooltips. */
  label: string;
  /** Compact name for dense cards and axes. */
  short: string;
  unit: string;
  kind: MetricKind;
  source: MeasurementSource;
  normalLo: number | null;
  normalHi: number | null;
  warnLow: number | null;
  warnHigh: number | null;
  critLow: number | null;
  critHigh: number | null;
  /** Decimal places used when displaying the value. */
  precision: number;
  /** Body systems this indicator informs. */
  systems: BodySystemId[];
  /** One sentence an astronaut can act on. */
  description: string;
  /** Range text per level, as configured in the database. */
  rangeText?: Partial<Record<HealthLevel, string>>;
}

export interface Reading {
  ts: number;
  value: number;
  level: HealthLevel;
}

export interface MetricSeries {
  metric: MetricDef;
  readings: Reading[];
}

export interface LatestReading extends Reading {
  metric: MetricDef;
}

export interface DailyRecord {
  day: number;
  ts: number;
  sleepHours: number | null;
  exerciseHours: number | null;
  radiation: number | null;
  cumulativeRadiation: number | null;
  levels: {
    sleep: HealthLevel;
    exercise: HealthLevel;
    radiation: HealthLevel;
  };
}

export type AlertSource = "dataset" | "baseline" | "rule" | "sensor" | "assessment";

export interface AlertRecord {
  id: number;
  subject: string;
  ts: number;
  metric: string;
  value: number;
  level: HealthLevel;
  source: AlertSource;
  message: string;
}

/* ------------------------------------------------------------------- crew */

export interface Subject {
  id: string;
  /** Fictional callsign — this is demonstration data, not a real crew. */
  name: string;
  role: string;
  agency: string;
  environment: "free_space" | "planetary_surface";
  /** Days since launch. */
  missionDay: number;
  /** Configured career radiation limit, mSv. */
  careerLimit: number;
}

/* ------------------------------------------------------------------ anatomy */

export interface BodySystem {
  id: BodySystemId;
  label: string;
  shortLabel: string;
  /** Where the system sits on the figure, in the 200 × 400 schematic viewBox. */
  region: { cx: number; cy: number };
  summary: string;
  function: string;
  /** What long-duration spaceflight does to this system. */
  spaceflightEffects: string[];
  /** Indicators the crew should watch for this system. */
  watchFor: string[];
  metricIds: string[];
  /** Assessment id that covers this system. */
  assessmentId: string;
  hazardIds: HazardId[];
}

/* ----------------------------------------------------------------- hazards */

export type HazardId =
  | "radiation"
  | "isolation"
  | "distance"
  | "gravity"
  | "hostile";

export interface Countermeasure {
  title: string;
  detail: string;
  /** "immediate" = do it now, "routine" = scheduled, "mission" = planning level. */
  cadence: "immediate" | "daily" | "weekly" | "mission";
  systemIds: BodySystemId[];
}

export interface Hazard {
  id: HazardId;
  name: string;
  /** NASA's five hazards framing, paraphrased for crew use. */
  tagline: string;
  what: string;
  howItAffects: string[];
  affectedSystems: BodySystemId[];
  metricIds: string[];
  consequences: string[];
  prevention: string[];
  countermeasures: Countermeasure[];
  /** Demonstration exposure figure, shown with a source note. */
  exposure: { label: string; value: string; note: string };
}

/* -------------------------------------------------------------- assessments */

export type AssessmentCategory = "cardiovascular" | "metabolic" | "neuro" | "musculoskeletal" | "behavioural" | "environmental";

export type AssessmentFieldType = "number" | "scale" | "select" | "text" | "boolean";

export interface AssessmentField {
  id: string;
  label: string;
  type: AssessmentFieldType;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  help?: string;
  options?: { value: string; label: string }[];
  /** Metric whose thresholds validate the entered value. */
  metricId?: string;
  required?: boolean;
}

export interface AssessmentStep {
  id: string;
  title: string;
  /** Short instruction lines, one idea per line. */
  guidance: string[];
  fields: AssessmentField[];
}

export interface AssessmentDefinition {
  id: string;
  name: string;
  shortName: string;
  category: AssessmentCategory;
  description: string;
  /** Why the measurement matters on a long-duration mission. */
  why: string;
  equipment: string[];
  instructions: string[];
  durationMinutes: number;
  /** How often the crew should run it. */
  cadence: string;
  steps: AssessmentStep[];
  /** What to do with the result, including escalation. */
  followUp: string;
  metricIds: string[];
  systemIds: BodySystemId[];
  /** Demonstrations only — a real deployment would pull this from the crew schedule. */
  lastCompletedDaysAgo: number | null;
}

export interface AssessmentAnswer {
  fieldId: string;
  value: string | number | boolean;
}

export interface AssessmentResult {
  assessmentId: string;
  subjectId: string;
  submittedAt: number;
  answers: AssessmentAnswer[];
  /** Highest level triggered by any validated metric field. */
  level: HealthLevel;
  notes: string;
}

/* ------------------------------------------------------------------ mission */

export interface Mission {
  name: string;
  vehicle: string;
  profile: string;
  /** Epoch seconds used as "now" for every relative timestamp in the demo. */
  now: number;
  launch: number;
  /** Destination body for the current transit leg. */
  destination: string;
  distanceFromEarthKm: number;
  /** Demonstration flight-plan distance for the transit leg. */
  plannedDistanceKm: number;
  /** One-way light time, seconds. */
  lightDelaySeconds: number;
  solarActivity: "quiet" | "elevated" | "storm";
}

export interface CrewStatus {
  subject: Subject;
  overall: HealthLevel;
  flagged: number;
  asOf: number;
}
