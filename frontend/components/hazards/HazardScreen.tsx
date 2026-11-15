"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Gauge, Info, Moon, Radiation, ShieldCheck, Zap } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { Chip, LevelBadge } from "@/components/ui/Badge";
import { HazardCard } from "@/components/hazards/HazardCard";
import { HazardDetail } from "@/components/hazards/HazardDetail";
import { HazardContext } from "@/components/hazards/HazardContext";
import { RadiationChart } from "@/components/charts/RadiationChart";
import { DailyBars, TrendChart } from "@/components/charts/TrendChart";
import { useCrew } from "@/components/providers/CrewProvider";
import {
  BODY_SYSTEM_MAP,
  BODY_SYSTEMS,
  DEFAULT_HAZARD_ID,
  FLIGHT_DAY_OFFSET,
  getDaily,
  getLatestMetric,
  getMetric,
  getRadiationSummary,
  getReadingsInWindow,
  HAZARDS,
  MISSION,
  MISSION_LIMITS,
  TRENDABLE_IDS,
} from "@/lib/data";
import { formatNumber } from "@/lib/health/format";
import { LEVELS, worstLevel } from "@/lib/health/levels";
import { takeSession } from "@/lib/utils/session";
import { cn } from "@/lib/utils/cn";
import type { BodySystemId, HazardId, HealthLevel } from "@/types";

const FOCUS_KEY = "astra:focus-hazard";

type Range = 24 | 72 | 168;

const RANGE_OPTIONS = [
  { value: 24 as Range, label: "24H" },
  { value: 72 as Range, label: "72H" },
  { value: 168 as Range, label: "7D" },
];

type CadenceFilter = "all" | "immediate" | "daily" | "weekly" | "mission";

const CADENCE_OPTIONS = [
  { value: "all" as CadenceFilter, label: "All" },
  { value: "immediate" as CadenceFilter, label: "Now" },
  { value: "daily" as CadenceFilter, label: "Daily" },
  { value: "weekly" as CadenceFilter, label: "Weekly" },
  { value: "mission" as CadenceFilter, label: "Mission" },
];

const CADENCE_DOT: Record<string, string> = {
  immediate: "bg-danger",
  daily: "bg-signal",
  weekly: "bg-violet",
  mission: "bg-mute",
};

export function HazardScreen() {
  const { subjectId, subject } = useCrew();
  const [activeId, setActiveId] = useState<HazardId>(DEFAULT_HAZARD_ID);
  const [metricId, setMetricId] = useState<string>("heart_rate");
  const [range, setRange] = useState<Range>(24);
  const [cadence, setCadence] = useState<CadenceFilter>("all");
  const pendingFocus = useRef<string | null | undefined>(undefined);

  /* Deep link from the digital human's hazard chips. */
  useEffect(() => {
    if (pendingFocus.current === undefined) {
      pendingFocus.current = takeSession(FOCUS_KEY);
    }
    const focus = pendingFocus.current;
    if (!focus) return;
    if (!HAZARDS.some((h) => h.id === focus)) return;
    const timer = window.setTimeout(() => setActiveId(focus as HazardId), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const hazard = HAZARDS.find((h) => h.id === activeId) ?? HAZARDS[0];

  const systemLevels = useMemo(() => {
    return BODY_SYSTEMS.reduce(
      (acc, system) => {
        const readings = system.metricIds
          .map((id) => getLatestMetric(subjectId, id))
          .filter((r): r is NonNullable<typeof r> => Boolean(r));
        acc[system.id] = readings.length
          ? worstLevel(readings.map((r) => r.level))
          : ("normal" as HealthLevel);
        return acc;
      },
      {} as Record<BodySystemId, HealthLevel>,
    );
  }, [subjectId]);

  const radiation = useMemo(() => getRadiationSummary(subjectId), [subjectId]);
  const daily = useMemo(() => getDaily(subjectId), [subjectId]);

  const trendable = hazard.metricIds.filter((id) =>
    (TRENDABLE_IDS as readonly string[]).includes(id),
  );
  const activeMetricId = trendable.includes(metricId) ? metricId : trendable[0];
  const activeMetric = activeMetricId ? getMetric(activeMetricId) : null;
  const readings = activeMetricId ? getReadingsInWindow(subjectId, activeMetricId, range) : [];

  const hasSleep = hazard.metricIds.includes("sleep_hours");
  const hasExercise = hazard.metricIds.includes("exercise_hours");

  const isRadiation = hazard.id === "radiation";

  const countermeasures = hazard.countermeasures.filter(
    (c) => cadence === "all" || c.cadence === cadence,
  );

  const radiationPoints = radiation.daily.map((record) => ({
    label: `FD${FLIGHT_DAY_OFFSET + record.day}`,
    daily: record.radiation ?? 0,
    cumulative: record.cumulativeRadiation ?? 0,
  }));

  const dailyPoints = daily.map((record) => ({
    label: `FD${FLIGHT_DAY_OFFSET + record.day}`,
    sleep: record.sleepHours,
    exercise: record.exerciseHours,
  }));

  return (
    <div className="space-y-3">
      <PageHeader
        index="05"
        section="Hazards"
        title="What space puts at risk"
        description="Five long-flight risks and the steps that reduce them."
        meta={
          <>
            <Chip tone="accent">{subject.name}</Chip>
            <Chip>5 risks</Chip>
            <Chip>{HAZARDS.reduce((sum, h) => sum + h.countermeasures.length, 0)} protective steps</Chip>
            <Chip tone="muted">Solar activity · {MISSION.solarActivity}</Chip>
          </>
        }
        actions={
          <>
            <Button href="/digital-human" variant="outline" size="sm">
              Body map <ArrowUpRight className="size-3" />
            </Button>
            <Button href="/assessment" variant="primary" size="sm">
              Health checks
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
        {HAZARDS.map((item) => (
          <HazardCard
            key={item.id}
            hazard={item}
            active={item.id === activeId}
            onSelect={() => setActiveId(item.id)}
          />
        ))}
      </div>

      <div className="grid gap-2.5 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <HazardDetail hazard={hazard} systemLevels={systemLevels} />
        </div>
        <div className="xl:col-span-5">
          <HazardContext hazard={hazard} subjectId={subjectId} />
        </div>
      </div>

      <div className="grid gap-2.5 xl:grid-cols-12">
        <Panel
          className="xl:col-span-8"
          label="Trend"
          title={
            isRadiation
              ? "Daily and total dose"
              : activeMetric
                ? activeMetric.label
                : hasSleep || hasExercise
                  ? "Sleep & exercise"
                  : "No live trend"
          }
          corners
          flush
          action={
            isRadiation ? (
              <span className="inline-flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-[0.1em] text-violet">
                <Radiation className="size-3" /> {radiation.limit} mSv ceiling
              </span>
            ) : activeMetric ? (
              <div className="flex items-center gap-1.5">
                <Segmented
                  options={trendable.map((id) => ({
                    value: id,
                    label: getMetric(id).short,
                  }))}
                  value={activeMetricId}
                  onChange={setMetricId}
                  ariaLabel="Linked indicator"
                />
                <Segmented options={RANGE_OPTIONS} value={range} onChange={setRange} ariaLabel="Time range" />
              </div>
            ) : null
          }
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 px-3.5 py-2">
            {isRadiation ? (
              <>
                <div className="flex items-baseline gap-3">
                  <span className="flex items-baseline gap-1">
                    <span className="num text-[20px] leading-none text-ink">
                      {formatNumber(radiation.cumulative, 2)}
                    </span>
                    <span className="font-mono text-[9px] text-dim">mSv total</span>
                  </span>
                  <span className="flex items-baseline gap-1">
                    <span className="num text-[13px] text-violet">{formatNumber(radiation.avgDaily, 2)}</span>
                    <span className="font-mono text-[9px] text-dim">mSv/day avg</span>
                  </span>
                  <span className="flex items-baseline gap-1">
                    <span className="num text-[13px] text-mute">{formatNumber(radiation.remaining, 1)}</span>
                    <span className="font-mono text-[9px] text-dim">mSv left</span>
                  </span>
                </div>
                <LevelBadge level={radiation.levelToday} size="xs" />
              </>
            ) : activeMetric ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="num text-[20px] leading-none text-ink">
                    {readings.length
                      ? `${formatNumber(readings[readings.length - 1].value, activeMetric.precision)} ${activeMetric.unit}`
                      : "—"}
                  </span>
                  <span className="font-mono text-[9px] text-dim">
                    {readings.length} samples · {activeMetric.rangeText?.normal ?? "—"} normal
                  </span>
                </div>
                <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-dim">
                  {hazard.name}
                </span>
              </>
            ) : (
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-dim">
                Self-report + scheduled checks
              </span>
            )}
          </div>

          <div className="px-1.5 pb-2 pt-2">
            {isRadiation ? (
              <RadiationChart data={radiationPoints} limit={radiation.limit} height={266} />
            ) : activeMetric ? (
              <TrendChart readings={readings} metric={activeMetric} rangeHours={range} height={266} />
            ) : hasSleep || hasExercise ? (
              <div className="space-y-2 px-2">
                {hasSleep && (
                  <div>
                    <div className="label-tech mb-1 flex items-center gap-1">
                      <Moon className="size-2.5 text-violet" /> Sleep vs. target
                    </div>
                    <DailyBars
                      data={dailyPoints.map((d) => ({ label: d.label, a: d.sleep, b: MISSION_LIMITS.sleepTarget }))}
                      series={{ a: "Sleep", b: "Target", colorA: "#8b9cff", colorB: "#35d07f" }}
                      height={108}
                      unit="h"
                    />
                  </div>
                )}
                {hasExercise && (
                  <div>
                    <div className="label-tech mb-1 flex items-center gap-1">
                      <Zap className="size-2.5 text-signal" /> Exercise vs. target
                    </div>
                    <DailyBars
                      data={dailyPoints.map((d) => ({
                        label: d.label,
                        a: d.exercise,
                        b: MISSION_LIMITS.exerciseTarget,
                      }))}
                      series={{ a: "Exercise", b: "Target", colorA: "#4ff0e4", colorB: "#35d07f" }}
                      height={108}
                      unit="h"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                <Gauge className="size-5 text-dim" />
                <p className="max-w-sm text-[11px] leading-relaxed text-mute">
                  This risk is tracked through reported symptoms in a health check, not a live sensor.
                </p>
                <Link
                  href="/assessment"
                  className="inline-flex items-center gap-1 rounded-md border border-signal/35 bg-signal/8 px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-signal transition-colors hover:bg-signal/16"
                >
                  Open health checks <ArrowUpRight className="size-2.5" />
                </Link>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/60 px-3.5 py-1.5">
            <span className="inline-flex items-center gap-1.5 font-mono text-[8.5px] uppercase tracking-[0.1em] text-dim">
              <Info className="size-2.5" />
              {isRadiation
                ? "Example doses · configured career limit"
                : activeMetric
                  ? "Hourly readings"
                  : "Example targets"}
            </span>
            <Link
              href="/biometrics"
              className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-mute hover:text-signal"
            >
              Vitals
            </Link>
          </div>
        </Panel>

        <Panel
          className="xl:col-span-4"
          title="Protective steps"
          flush
          action={
            <Segmented
              options={CADENCE_OPTIONS}
              value={cadence}
              onChange={setCadence}
              ariaLabel="Step cadence"
            />
          }
        >
          <ul className="scroll-thin max-h-[360px] divide-y divide-line/40 overflow-y-auto">
            {countermeasures.map((countermeasure) => (
              <li key={countermeasure.title} className="px-2.5 py-2">
                <div className="flex items-start gap-1.5">
                  <span
                    className={cn(
                      "mt-1 size-1.5 shrink-0 rounded-full",
                      CADENCE_DOT[countermeasure.cadence],
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[10.5px] text-ink/90">{countermeasure.title}</p>
                      <span className="shrink-0 font-mono text-[8px] uppercase tracking-[0.1em] text-dim">
                        {countermeasure.cadence}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[9.5px] leading-snug text-mute">{countermeasure.detail}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {countermeasure.systemIds.map((id) => (
                        <span
                          key={id}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-sm border border-line/60 px-1 py-px font-mono text-[8px] text-dim",
                          )}
                        >
                          <span className={cn("size-1 rounded-full", LEVELS[systemLevels[id]].dot)} />
                          {BODY_SYSTEM_MAP[id].shortLabel}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </li>
            ))}
            {countermeasures.length === 0 && (
              <li className="px-3 py-6 text-center text-[10.5px] text-mute">
                No steps in this cadence.
              </li>
            )}
          </ul>
          <div className="flex items-center justify-between border-t border-line/60 px-3 py-1.5 font-mono text-[8.5px] uppercase tracking-[0.08em] text-dim">
            <span>
              {countermeasures.length} of {hazard.countermeasures.length} shown
            </span>
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="size-2.5" /> Guidance only
            </span>
          </div>
        </Panel>
      </div>

      <div className="panel flex items-start gap-2 px-3 py-2.5">
        <Info className="mt-px size-3.5 shrink-0 text-signal/70" />
        <p className="text-[10px] leading-relaxed text-mute">
          Example exposure values. General spaceflight guidance, not a diagnosis.
        </p>
      </div>
    </div>
  );
}
