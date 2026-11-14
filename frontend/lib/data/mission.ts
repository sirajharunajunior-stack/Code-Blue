import { DEMO_NOW } from "@/lib/data/vitals";
import { CAREER_LIMIT_MSV } from "@/lib/data/reference";
import type { Mission } from "@/types";

const DAY = 86400;

/**
 * Fictional mission frame for the demonstration build. The clock is anchored to
 * the newest reading in the dataset (`DEMO_NOW`) so relative timestamps and the
 * charts agree with each other.
 */
const ELAPSED_DAYS = 214;
const ELAPSED_EXTRA_SECONDS = 6 * 3600 + 11 * 60;

export const MISSION: Mission = {
  name: "HELIOS TRANSIT 7",
  vehicle: "Odyssey transit habitat",
  profile: "Long-duration transit · beyond low Earth orbit",
  now: DEMO_NOW,
  launch: DEMO_NOW - (ELAPSED_DAYS * DAY + ELAPSED_EXTRA_SECONDS),
  destination: "Mars — Jezero approach",
  distanceFromEarthKm: 78_400_000,
  plannedDistanceKm: 225_000_000,
  lightDelaySeconds: 261,
  solarActivity: "elevated",
};

export const MISSION_DAY = ELAPSED_DAYS;

/** First flight day covered by the 7-day dataset (used for daily charts). */
export const FLIGHT_DAY_OFFSET = MISSION_DAY - 7;

export const MISSION_LIMITS = {
  radiationCareer: CAREER_LIMIT_MSV,
  /** Explicitly a demonstration value, not a NASA-approved limit. */
  sleepTarget: 7,
  exerciseTarget: 2,
} as const;
