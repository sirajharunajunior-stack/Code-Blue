"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, ClipboardCheck, Info, Radiation, ShieldAlert } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Chip, DemoTag, LevelBadge, LevelDot, SourceTag } from "@/components/ui/Badge";
import { Meter } from "@/components/ui/Meter";
import { Sparkline } from "@/components/ui/Sparkline";
import {
  BODY_SYSTEM_MAP,
  getAssessment,
  getDaily,
  getLatestMetric,
  getMetric,
  getRadiationSummary,
  getReadingsInWindow,
  MISSION,
} from "@/lib/data";
import { formatMetricValue, formatNumber, formatRelative } from "@/lib/health/format";
import { LEVELS } from "@/lib/health/levels";
import { writeSession } from "@/lib/utils/session";
import type { Hazard, HealthLevel, MetricDef } from "@/types";

interface IndicatorRow {
  metric: MetricDef;
  value: number | null;
  level: HealthLevel | null;
  ts: number | null;
  spark: number[];
  detail?: string;
}

function buildRows(hazard: Hazard, subjectId: string): IndicatorRow[] {
  const daily = getDaily(subjectId);

  return hazard.metricIds.map((id) => {
    const metric = getMetric(id);
    const latest = getLatestMetric(subjectId, id);

    const spark =
      metric.kind === "daily"
        ? daily
            .map((record) =>
              id === "sleep_hours"
                ? record.sleepHours
                : id === "exercise_hours"
                  ? record.exerciseHours
                  : id === "radiation"
                    ? record.radiation
                    : null,
            )
            .filter((v): v is number => v !== null)
        : getReadingsInWindow(subjectId, id, 24)
            .slice(-24)
            .map((r) => r.value);

    return {
      metric,
      value: latest?.value ?? null,
      level: latest?.level ?? null,
      ts: latest?.ts ?? null,
      spark,
      detail: latest ? undefined : "Collected in a health check",
    };
  });
}

export function HazardContext({ hazard, subjectId }: { hazard: Hazard; subjectId: string }) {
  const router = useRouter();
  const rows = buildRows(hazard, subjectId);
  const radiation = getRadiationSummary(subjectId);
  const primarySystem = BODY_SYSTEM_MAP[hazard.affectedSystems[0]];
  const assessment = getAssessment(primarySystem.assessmentId);

  const openAssessment = () => {
    if (!assessment) return;
    writeSession("astra:focus-assessment", assessment.id);
    router.push("/assessment");
  };

  return (
    <div className="space-y-2.5">
      <Panel title={hazard.exposure.label} action={<DemoTag />} corners>
        <div className="flex items-baseline gap-1.5">
          <span className="num text-[24px] leading-none text-ink">{hazard.exposure.value}</span>
        </div>
        <p className="mt-1.5 text-[10px] leading-snug text-mute">{hazard.exposure.note}</p>

        {hazard.id === "radiation" && (
          <dl className="mt-2.5 space-y-1 border-t border-line/60 pt-2 font-mono text-[9.5px]">
            <div className="flex justify-between">
              <dt className="text-dim">Career total</dt>
              <dd className="num text-ink">{formatNumber(radiation.cumulative, 2)} / {radiation.limit} mSv</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-dim">Remaining</dt>
              <dd className="num text-ink">{formatNumber(radiation.remaining, 1)} mSv</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-dim">7-day average</dt>
              <dd className="num text-ink">{formatNumber(radiation.avgDaily, 2)} mSv/day</dd>
            </div>
          </dl>
        )}

        {hazard.id !== "radiation" && (
          <div className="mt-2 flex items-center gap-1.5 border-t border-line/60 pt-2 font-mono text-[8.5px] text-dim">
            <Radiation className="size-2.5 text-violet" />
            Shared dose: {formatNumber(radiation.cumulative, 2)} of {radiation.limit} mSv
          </div>
        )}
      </Panel>

      <Panel
        title="Linked readings"
        flush
        action={
          <Link href="/biometrics" className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-dim hover:text-signal">
            All vitals
          </Link>
        }
      >
        <ul className="divide-y divide-line/40">
          {rows.map(({ metric, value, level, ts, spark, detail }) => {
            const meta = level ? LEVELS[level] : null;
            return (
              <li key={metric.id} className="px-2.5 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      {level ? <LevelDot level={level} /> : <span className="size-1.5 rounded-full bg-dim" />}
                      <span className="truncate text-[10.5px] text-ink/90">{metric.label}</span>
                      <SourceTag source={metric.source} />
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 font-mono text-[8px] uppercase tracking-[0.08em] text-dim">
                      {ts ? formatRelative(ts, MISSION.now) : detail}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    {value !== null ? (
                      <>
                        <div className="num text-[11px] text-ink">{formatMetricValue(metric, value)}</div>
                        <div className="mt-0.5 flex justify-end">
                          {level && <LevelBadge level={level} size="xs" showDot={false} />}
                        </div>
                      </>
                    ) : (
                      <span className="chip border-line/60 text-dim">check</span>
                    )}
                  </div>
                </div>

                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1">
                    <Meter metric={metric} value={value} level={level ?? "normal"} compact />
                  </div>
                  {spark.length > 1 && (
                    <div className="w-16 shrink-0">
                      <Sparkline
                        values={spark}
                        height={14}
                        strokeWidth={1}
                        area={false}
                        showLast={false}
                        color={meta?.hex ?? "#4f6878"}
                      />
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>

      {assessment && (
        <Panel title="Related health check" action={<ClipboardCheck className="size-3.5 text-signal/80" />}>
          <p className="text-[10px] leading-relaxed text-mute">{assessment.description}</p>
          <div className="mt-2 flex items-center gap-1.5 font-mono text-[8.5px] text-dim">
            <span className="inline-flex items-center gap-1">
              <ShieldAlert className="size-2.5" /> {assessment.cadence}
            </span>
            <span>· {assessment.durationMinutes} min</span>
          </div>
          <Button variant="primary" size="sm" className="mt-2 w-full" onClick={openAssessment}>
            Open health check <ArrowUpRight className="size-3" />
          </Button>
          <div className="mt-2 flex flex-wrap gap-1">
            {hazard.affectedSystems.map((id) => (
              <Link key={id} href="/digital-human" className="transition-colors hover:text-signal">
                <Chip tone="muted">{BODY_SYSTEM_MAP[id].shortLabel}</Chip>
              </Link>
            ))}
          </div>
        </Panel>
      )}

      <div className="panel flex items-start gap-2 px-2.5 py-2">
        <Info className="mt-px size-3 shrink-0 text-signal/70" />
        <p className="text-[9px] leading-relaxed text-dim">
          General guidance. Exposure values are example figures.
        </p>
      </div>
    </div>
  );
}
