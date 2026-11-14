import reference from "@/lib/data/reference.json";
import type { HealthLevel } from "@/types";

interface RawMetric {
  name: string;
  unit: string;
  kind: "vital" | "daily";
  normal_lo: number | null;
  normal_hi: number | null;
  warn_low: number | null;
  warn_high: number | null;
  crit_low: number | null;
  crit_high: number | null;
  extra: string;
  note: string | null;
}

export const RAW_METRICS = reference.metrics as RawMetric[];
export const RAW_LEVELS = reference.levels as {
  code: number;
  name: HealthLevel;
  label: string;
  meaning: string;
  action: string;
  color: string;
}[];
export const LEVEL_RANGES = reference.ranges as Record<
  string,
  Partial<Record<HealthLevel, string>>
>;

export const META = reference.meta as {
  description?: string;
  mission_profile?: string;
  radiation_career_limit_mSv?: number;
};

/** 600 mSv career limit, read from the database rather than hard-coded. */
export const CAREER_LIMIT_MSV = META.radiation_career_limit_mSv ?? 600;

export const DEMO_NOTE = reference._note as string;
