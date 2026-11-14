"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Clock3, TrendingUp } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { LevelBadge, LevelDot, SourceTag } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getAssessment } from "@/lib/data/assessments";
import { getDelta, getLatestFor, getLatestMetric } from "@/lib/data/vitals";
import { formatDelta, formatMetricValue, formatRelative } from "@/lib/health/format";
import { isAssessmentDue, useAssessments } from "@/lib/assessment-store";
import { MISSION } from "@/lib/data/mission";
import { cn } from "@/lib/utils/cn";
import type { BodySystem } from "@/types";

const CARD_LABEL = "Digital human / supporting";

export function SystemCards({ system, subjectId }: { system: BodySystem; subjectId: string }) {
  const router = useRouter();
  const assessments = useAssessments(subjectId);
  const assessment = getAssessment(system.assessmentId);
  const status = assessment ? assessments.statusFor(assessment.id) : null;
  const due = assessment && status ? isAssessmentDue(assessment.cadence, status.lastCompletedAt) : false;

  const latest = system.metricIds
    .map((id) => getLatestMetric(subjectId, id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .slice(0, 3);

  const changes = system.metricIds
    .map((id) => {
      const reading = getLatestFor(subjectId, id);
      const delta = getDelta(subjectId, id, 24);
      if (!reading || delta === null) return null;
      return { reading, delta };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 3);

  const openAssessment = () => {
    if (!assessment) return;
    window.sessionStorage.setItem("astra:focus-assessment", assessment.id);
    router.push("/assessment");
  };

  return (
    <div className="grid gap-2.5 lg:grid-cols-3">
      <Panel label={CARD_LABEL} title="Latest in this system">
        {latest.length === 0 ? (
          <p className="py-3 text-[10.5px] text-mute">No instrument readings mapped to this system.</p>
        ) : (
          <ul className="space-y-1.5">
            {latest.map((reading) => (
              <li key={reading.metric.id} className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5">
                  <LevelDot level={reading.level} />
                  <span className="truncate text-[10.5px] text-ink/90">{reading.metric.short}</span>
                  <SourceTag source={reading.metric.source} />
                </span>
                <span className="flex shrink-0 items-baseline gap-1.5">
                  <span className="num text-[11px] text-ink">{formatMetricValue(reading.metric, reading.value)}</span>
                  <span className="font-mono text-[8.5px] text-dim">{formatRelative(reading.ts, MISSION.now)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel label={CARD_LABEL} title="Assessment status">
        {assessment && status ? (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[11px] text-ink">{assessment.shortName}</p>
                <p className="mt-0.5 inline-flex items-center gap-1 font-mono text-[9px] text-dim">
                  <Clock3 className="size-2.5" />
                  {status.lastCompletedAt
                    ? `${status.seeded ? "Last " : "Completed "}${formatRelative(status.lastCompletedAt, MISSION.now)}`
                    : "Never completed"}
                </p>
              </div>
              {due ? (
                <span className="chip border-amber/40 text-amber">DUE</span>
              ) : status.lastLevel ? (
                <LevelBadge level={status.lastLevel} size="xs" />
              ) : status.lastCompletedAt ? (
                <span className="chip border-line/60 text-dim">LOGGED</span>
              ) : (
                <span className="chip border-line/60 text-dim">AVAILABLE</span>
              )}
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={openAssessment}>
              {status.lastCompletedAt ? "Repeat assessment" : "Start assessment"}
              <ArrowUpRight className="size-3" />
            </Button>
          </div>
        ) : (
          <p className="py-3 text-[10.5px] text-mute">No assessment linked to this system.</p>
        )}
      </Panel>

      <Panel label={CARD_LABEL} title="Change over 24 h">
        {changes.length === 0 ? (
          <p className="py-3 text-[10.5px] text-mute">No comparable readings in the last 24 hours.</p>
        ) : (
          <ul className="space-y-1.5">
            {changes.map(({ reading, delta }) => (
              <li key={reading.metric.id} className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5">
                  <TrendingUp className={cn("size-2.5 shrink-0", delta < 0 ? "rotate-180 text-dim" : "text-signal/70")} />
                  <span className="truncate text-[10.5px] text-ink/90">{reading.metric.short}</span>
                </span>
                <span className="flex shrink-0 items-baseline gap-1.5">
                  <span
                    className={cn(
                      "num text-[10.5px]",
                      reading.level === "normal" ? "text-mute" : "text-amber",
                    )}
                  >
                    {formatDelta(delta, reading.metric.precision, reading.metric.unit)}
                  </span>
                  <span className="num text-[10.5px] text-ink">{formatMetricValue(reading.metric, reading.value)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/biometrics"
          className="mt-2 flex items-center justify-between border-t border-line/60 pt-2 font-mono text-[9px] uppercase tracking-[0.1em] text-mute hover:text-signal"
        >
          Open full trend <ArrowUpRight className="size-2.5" />
        </Link>
      </Panel>
    </div>
  );
}
