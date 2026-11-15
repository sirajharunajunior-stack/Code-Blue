"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ClipboardCheck, Info, ScanLine } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { Chip, LevelBadge, SourceTag } from "@/components/ui/Badge";
import { MetricCard } from "@/components/biometrics/MetricCard";
import { StatusPanel } from "@/components/biometrics/StatusPanel";
import { AlertsPanel } from "@/components/biometrics/AlertsPanel";
import { RecentMeasurements } from "@/components/biometrics/RecentMeasurements";
import { DailyPanel } from "@/components/biometrics/DailyPanel";
import { RadiationPanel } from "@/components/biometrics/RadiationPanel";
import { TrendChart } from "@/components/charts/TrendChart";
import { useCrew } from "@/components/providers/CrewProvider";
import { useAssessments } from "@/lib/assessment-store";
import {
  ASSESSMENTS,
  getAlerts,
  getDaily,
  getDelta,
  getLatestAll,
  getLatestVitals,
  getMetric,
  getRadiationSummary,
  getReadingsInWindow,
  METRICS,
  MISSION_DAY,
  PRIMARY_VITAL_IDS,
  TRENDABLE_IDS,
} from "@/lib/data";
import { formatMetricValue } from "@/lib/health/format";
import { worstLevel } from "@/lib/health/levels";
import type { HealthLevel, LatestReading } from "@/types";

type Range = 24 | 72 | 168;

const RANGE_OPTIONS = [
  { value: 24 as Range, label: "24H" },
  { value: 72 as Range, label: "72H" },
  { value: 168 as Range, label: "7D" },
];

const TREND_OPTIONS = TRENDABLE_IDS.map((id) => ({
  value: id,
  label: id === "bp_systolic" ? "SYS" : id === "bp_diastolic" ? "DIA" : METRICS[id].short.replace("Cabin ", ""),
}));

export function BiometricsScreen() {
  const { subjectId, subject } = useCrew();
  const [metricId, setMetricId] = useState<string>("heart_rate");
  const [range, setRange] = useState<Range>(24);

  const latest = useMemo(() => getLatestVitals(subjectId), [subjectId]);
  const latestById = useMemo(
    () => Object.fromEntries(latest.map((reading) => [reading.metric.id, reading])) as Record<string, LatestReading>,
    [latest],
  );

  const allLatest = useMemo(() => getLatestAll(subjectId), [subjectId]);
  const overall = useMemo<HealthLevel>(() => worstLevel(allLatest.map((r) => r.level)), [allLatest]);
  const flagged = useMemo(() => allLatest.filter((r) => r.level !== "normal"), [allLatest]);

  const metric = getMetric(metricId);
  const readings = useMemo(
    () => getReadingsInWindow(subjectId, metricId, range),
    [subjectId, metricId, range],
  );

  const daily = useMemo(() => getDaily(subjectId), [subjectId]);
  const radiation = useMemo(() => getRadiationSummary(subjectId), [subjectId]);
  const alerts = useMemo(() => getAlerts(subjectId, 5), [subjectId]);
  const assessments = useAssessments(subjectId);

  const sparkFor = (id: string) =>
    getReadingsInWindow(subjectId, id, 24)
      .slice(-28)
      .map((r) => r.value);

  const cards = PRIMARY_VITAL_IDS.flatMap((id) => {
    const primary = latestById[id];
    if (!primary) return [];
    const secondary = id === "bp_systolic" ? latestById["bp_diastolic"] : undefined;
    return [
      {
        id,
        primary,
        secondary,
        spark: sparkFor(id),
        delta: getDelta(subjectId, id, 24),
        tone: id === "cabin_co2" ? ("environment" as const) : ("default" as const),
      },
    ];
  });

  const delta = getDelta(subjectId, metricId, 24);
  const rangeText = metric.rangeText?.normal;
  const lastReading = readings[readings.length - 1];

  return (
    <div className="space-y-3">
      <PageHeader
        index="02"
        section="Vitals"
        title="Your vitals"
        description="Latest readings and trends. Pick a card to change the chart."
        meta={
          <>
            <Chip tone="accent">{subject.name}</Chip>
            <Chip>Flight day {MISSION_DAY}</Chip>
            <Chip>{allLatest.length} readings</Chip>
          </>
        }
        actions={
          <>
            <Button href="/digital-human" variant="outline" size="sm">
              <ScanLine className="size-3" /> Body map
            </Button>
            <Button href="/assessment" variant="primary" size="sm">
              <ClipboardCheck className="size-3" /> Health check
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {cards.map((card) => (
          <MetricCard
            key={card.id}
            primary={card.primary}
            secondary={card.secondary}
            spark={card.spark}
            delta={card.delta}
            tone={card.tone}
            active={card.id === metricId || (metricId === "bp_diastolic" && card.id === "bp_systolic")}
            onSelect={() => setMetricId(card.id)}
          />
        ))}
      </div>

      <div className="grid gap-2.5 xl:grid-cols-12">
        <Panel
          className="xl:col-span-8"
          label="Trend"
          title={metric.label}
          corners
          flush
          action={<Segmented options={RANGE_OPTIONS} value={range} onChange={setRange} ariaLabel="Time range" />}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 px-3.5 py-2">
            <div className="flex items-baseline gap-2">
              <span className="num text-[24px] leading-none text-ink">
                {lastReading ? formatMetricValue(metric, lastReading.value) : "—"}
              </span>
              <LevelBadge level={lastReading?.level ?? overall} size="xs" />
              {delta !== null && (
                <span className="font-mono text-[9.5px] text-mute">
                  {delta > 0 ? "▲" : delta < 0 ? "▼" : "■"} {formatMetricValue(metric, Math.abs(delta))} / 24h
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <SourceTag source={metric.source} />
              {rangeText && (
                <span className="font-mono text-[9px] text-dim">
                  normal {rangeText} {metric.unit}
                </span>
              )}
            </div>
          </div>

          <div className="scroll-thin overflow-x-auto border-b border-line/50 px-3 py-1.5">
            <Segmented options={TREND_OPTIONS} value={metricId} onChange={setMetricId} ariaLabel="Reading" />
          </div>

          <div className="px-1.5 pb-2 pt-2">
            <TrendChart readings={readings} metric={metric} rangeHours={range} height={252} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/60 px-3.5 py-1.5">
            <span className="inline-flex items-center gap-1.5 font-mono text-[8.5px] uppercase tracking-[0.1em] text-dim">
              <span className="h-1.5 w-4 rounded-full bg-aurora/30" /> Normal range
            </span>
            <span className="font-mono text-[8.5px] text-dim">{readings.length} samples</span>
          </div>
        </Panel>

        <div className="space-y-2.5 xl:col-span-4">
          <StatusPanel
            overall={overall}
            flagged={flagged}
            latestCount={allLatest.length}
            lastReadingAt={allLatest.length ? Math.max(...allLatest.map((r) => r.ts)) : null}
            completedThisWeek={assessments.completedThisWeek}
            totalAssessments={ASSESSMENTS.length}
          />
          <AlertsPanel alerts={alerts} />
        </div>
      </div>

      <div className="grid gap-2.5 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <RecentMeasurements readings={allLatest} />
        </div>
        <div className="xl:col-span-4">
          <DailyPanel daily={daily} />
        </div>
        <div className="xl:col-span-3">
          <RadiationPanel summary={radiation} />
        </div>
      </div>

      <div className="panel flex items-start gap-2 px-3 py-2.5">
        <Info className="mt-px size-3.5 shrink-0 text-signal/70" />
        <p className="text-[10px] leading-relaxed text-mute">
          Demo data, shown for information only. Ranges are configured for this mission, not clinical
          limits.
        </p>
        <Link
          href="/assessment"
          className="ml-auto hidden shrink-0 items-center gap-1 font-mono text-[9px] uppercase tracking-[0.1em] text-signal hover:underline sm:flex"
        >
          Health checks <ArrowUpRight className="size-2.5" />
        </Link>
      </div>
    </div>
  );
}
