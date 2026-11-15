"use client";

import { useRouter } from "next/navigation";
import { ArrowUpRight, ClipboardCheck, Radiation } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Chip, LevelBadge, LevelDot, SourceTag } from "@/components/ui/Badge";
import { Meter } from "@/components/ui/Meter";
import { Sparkline } from "@/components/ui/Sparkline";
import {
  getAssessment,
  getHazard,
  getLatestMetric,
  getMetric,
  getReadingsInWindow,
} from "@/lib/data";
import { formatMetricValue } from "@/lib/health/format";
import { LEVELS, worstLevel } from "@/lib/health/levels";
import { writeSession } from "@/lib/utils/session";
import type { BodySystem, HealthLevel } from "@/types";

export function SystemPanel({ system, subjectId }: { system: BodySystem; subjectId: string }) {
  const router = useRouter();
  const assessment = getAssessment(system.assessmentId);

  const rows = system.metricIds.map((id) => {
    const metric = getMetric(id);
    const latest = getLatestMetric(subjectId, id);
    const spark = getReadingsInWindow(subjectId, id, 24)
      .slice(-24)
      .map((r) => r.value);
    return { metric, latest, spark };
  });

  const recorded = rows.filter((row) => row.latest);
  const level: HealthLevel = recorded.length
    ? worstLevel(recorded.map((row) => row.latest!.level))
    : "normal";

  const openAssessment = () => {
    if (!assessment) return;
    writeSession("astra:focus-assessment", assessment.id);
    router.push("/assessment");
  };

  return (
    <Panel
      title={system.label}
      action={<LevelBadge level={level} size="xs" />}
      corners
      flush
    >
      <div className="scroll-thin max-h-[560px] space-y-3 overflow-y-auto p-3.5">
        <p className="text-[11.5px] leading-relaxed text-mute">{system.summary}</p>

        <div>
          <div className="label-tech mb-1.5">Readings</div>
          <div className="space-y-1.5">
            {rows.map(({ metric, latest, spark }) => {
              const reading = latest;
              const meta = reading ? LEVELS[reading.level] : null;
              return (
                <div key={metric.id} className="rounded-md border border-line/70 bg-deep/40 px-2 py-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5">
                      {meta ? <LevelDot level={reading!.level} /> : <span className="size-1.5 rounded-full bg-dim" />}
                      <span className="truncate text-[10.5px] text-ink/90">{metric.label}</span>
                      <SourceTag source={metric.source} />
                    </span>
                    <span className="flex shrink-0 items-baseline gap-1">
                      {reading ? (
                        <>
                          <span className="num text-[11px] text-ink">{formatMetricValue(metric, reading.value)}</span>
                          <LevelBadge level={reading.level} size="xs" showDot={false} />
                        </>
                      ) : (
                        <span className="font-mono text-[9px] text-dim">not recorded</span>
                      )}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex-1">
                      <Meter metric={metric} value={reading?.value ?? null} level={reading?.level ?? "normal"} compact />
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
                </div>
              );
            })}
          </div>
          {rows.some((row) => !row.latest) && (
            <p className="mt-1.5 text-[9px] leading-snug text-dim">
              Missing readings are collected in the matching health check.
            </p>
          )}
        </div>

        <div>
          <div className="label-tech mb-1.5">What to watch for</div>
          <ul className="grid gap-1">
            {system.watchFor.map((item) => (
              <li
                key={item}
                className="rounded border border-line/60 bg-deep/40 px-2 py-1 text-[10px] leading-snug text-ink/80"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="label-tech mb-1.5">Related hazards</div>
          <div className="flex flex-wrap gap-1">
            {system.hazardIds.map((id) => {
              const hazard = getHazard(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    writeSession("astra:focus-hazard", hazard.id);
                    router.push("/hazards");
                  }}
                  className="transition-colors hover:text-signal"
                >
                  <Chip tone="muted">
                    <Radiation className="size-2.5" />
                    {hazard.name}
                  </Chip>
                </button>
              );
            })}
          </div>
        </div>

        {assessment && (
          <div className="rounded-md border border-signal/25 bg-signal/5 p-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="label-tech mb-0.5">Linked health check</div>
                <p className="text-[11px] text-ink">{assessment.name}</p>
                <p className="mt-0.5 text-[9.5px] text-dim">
                  {assessment.durationMinutes} min · {assessment.cadence}
                </p>
              </div>
              <ClipboardCheck className="size-4 shrink-0 text-signal/80" />
            </div>
            <Button variant="primary" size="sm" className="mt-2 w-full" onClick={openAssessment}>
              Start check <ArrowUpRight className="size-3" />
            </Button>
          </div>
        )}
      </div>
    </Panel>
  );
}
