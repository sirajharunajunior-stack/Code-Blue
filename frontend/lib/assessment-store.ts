"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ASSESSMENTS, getMetric, MISSION } from "@/lib/data";
import { classify } from "@/lib/health/levels";
import type {
  AssessmentAnswer,
  AssessmentResult,
  HealthLevel,
} from "@/types";

const STORAGE_KEY = "astra:assessment-results:v1";
const EVENT = "astra:assessments-changed";

/**
 * Assessment results are kept locally: this build has no write API yet.
 * The shape matches what `POST /api/...` would accept, so swapping in a real
 * endpoint only changes this module.
 */
type StoredResult = AssessmentResult;

const HEALTH_LEVELS: HealthLevel[] = [
  "normal",
  "slightly_abnormal",
  "needs_checkup",
  "critical",
];

/** Reject anything that does not match the persisted shape, so a corrupted or
 *  older localStorage entry cannot crash the assessment screen. */
function isStoredResult(value: unknown): value is StoredResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;
  return (
    typeof result.assessmentId === "string" &&
    typeof result.subjectId === "string" &&
    typeof result.submittedAt === "number" &&
    Number.isFinite(result.submittedAt) &&
    Array.isArray(result.answers) &&
    typeof result.notes === "string" &&
    HEALTH_LEVELS.includes(result.level as HealthLevel)
  );
}

function readAll(): StoredResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter(isStoredResult).sort((a, b) => b.submittedAt - a.submittedAt)
      : [];
  } catch {
    return [];
  }
}

function writeAll(results: StoredResult[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
  } catch {
    /* Quota or disabled storage: keep the in-memory result and notify listeners. */
  }
  window.dispatchEvent(new Event(EVENT));
  window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
}

/** Highest level any metric-backed answer would be classified as. */
export function levelFromAnswers(assessmentId: string, answers: AssessmentAnswer[]): HealthLevel {
  const rank = (level: HealthLevel) =>
    ["normal", "slightly_abnormal", "needs_checkup", "critical"].indexOf(level);

  let level: HealthLevel = "normal";
  for (const answer of answers) {
    const metricId = metricForAssessmentField(assessmentId, answer.fieldId);
    if (!metricId) continue;
    const value = Number(answer.value);
    if (!Number.isFinite(value)) continue;
    const classified = classify(getMetric(metricId), value);
    if (rank(classified) > rank(level)) level = classified;
  }
  return level;
}

/** Resolve the metric backing a specific assessment field. */
export function metricForAssessmentField(assessmentId: string, fieldId: string): string | null {
  const assessment = ASSESSMENTS.find((a) => a.id === assessmentId);
  for (const step of assessment?.steps ?? []) {
    const field = step.fields.find((f) => f.id === fieldId);
    if (field) return field.metricId ?? null;
  }
  return null;
}

export interface AssessmentStatus {
  /** Newest result for this assessment, including the seeded demonstration value. */
  lastCompletedAt: number | null;
  /** True when the timestamp came from the dataset seed rather than this session. */
  seeded: boolean;
  lastLevel: HealthLevel | null;
}

/**
 * "daily" / "weekly" cadence expressed as a due window in days.
 * `null` means the check has no schedule and is always available.
 */
export function dueWindowDays(cadence: string): number | null {
  const lower = cadence.toLowerCase();
  if (lower.includes("daily")) return 1.2;
  if (lower.includes("twice")) return 4;
  if (lower.includes("weekly")) return 7.5;
  if (lower.includes("as needed") || lower.includes("any time")) return null;
  return 7;
}

/** A check is due when it has never been done or its cadence window has passed. */
export function isAssessmentDue(
  cadence: string,
  lastCompletedAt: number | null,
  now = MISSION.now,
): boolean {
  const windowDays = dueWindowDays(cadence);
  if (windowDays === null) return false;
  if (lastCompletedAt === null) return true;
  return (now - lastCompletedAt) / 86400 > windowDays;
}

export function useAssessments(subjectId: string) {
  const [results, setResults] = useState<StoredResult[]>([]);

  useEffect(() => {
    const sync = () => setResults(readAll().filter((r) => r.subjectId === subjectId));

    /* Deferred so the first read is a background update rather than a render
       cascaded out of the effect body. */
    const timer = window.setTimeout(sync, 0);

    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [subjectId]);

  const submit = useCallback(
    (input: {
      assessmentId: string;
      answers: AssessmentAnswer[];
      notes: string;
    }) => {
      const result: StoredResult = {
        assessmentId: input.assessmentId,
        subjectId,
        submittedAt: MISSION.now,
        answers: input.answers,
        level: levelFromAnswers(input.assessmentId, input.answers),
        notes: input.notes,
      };
      const all = readAll();
      writeAll([result, ...all]);
      setResults(readAll().filter((r) => r.subjectId === subjectId));
      return result;
    },
    [subjectId],
  );

  const byAssessment = useMemo(() => {
    const map: Record<string, StoredResult[]> = {};
    for (const result of results) {
      (map[result.assessmentId] ??= []).push(result);
    }
    return map;
  }, [results]);

  const statusFor = useCallback(
    (assessmentId: string): AssessmentStatus => {
      const list = byAssessment[assessmentId] ?? [];
      const own = list[0];
      if (own) return { lastCompletedAt: own.submittedAt, seeded: false, lastLevel: own.level };

      const definition = ASSESSMENTS.find((a) => a.id === assessmentId);
      if (definition?.lastCompletedDaysAgo === null || definition?.lastCompletedDaysAgo === undefined) {
        return { lastCompletedAt: null, seeded: false, lastLevel: null };
      }
      return {
        lastCompletedAt: MISSION.now - definition.lastCompletedDaysAgo * 86400,
        seeded: true,
        lastLevel: null,
      };
    },
    [byAssessment],
  );

  const completedThisWeek = useMemo(() => {
    const cutoff = MISSION.now - 7 * 86400;
    const completed = new Set(
      results.filter((r) => r.submittedAt >= cutoff).map((r) => r.assessmentId),
    );
    /* Seeded "last completed" dates belong to the demonstration record, so they
       count towards this week's completion too — otherwise a card can read
       "2 days ago" while the progress panel says nothing was done. */
    for (const definition of ASSESSMENTS) {
      const age = definition.lastCompletedDaysAgo;
      if (age === null || age === undefined) continue;
      if (completed.has(definition.id)) continue;
      if (age <= 7) completed.add(definition.id);
    }
    return completed.size;
  }, [results]);

  return {
    results,
    byAssessment,
    statusFor,
    completedThisWeek,
    submit,
  };
}
