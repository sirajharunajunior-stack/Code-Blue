import Link from "next/link";
import { ArrowUpRight, ClipboardCheck } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { LevelBadge, LevelDot } from "@/components/ui/Badge";
import { LEVELS, rankOf } from "@/lib/health/levels";
import { formatMetricValue, formatRelative } from "@/lib/health/format";
import { MISSION } from "@/lib/data/mission";
import { cn } from "@/lib/utils/cn";
import type { HealthLevel, LatestReading } from "@/types";

export function StatusPanel({
  overall,
  flagged,
  latestCount,
  lastReadingAt,
  completedThisWeek,
  totalAssessments,
}: {
  overall: HealthLevel;
  flagged: LatestReading[];
  latestCount: number;
  lastReadingAt: number | null;
  completedThisWeek: number;
  totalAssessments: number;
}) {
  const meta = LEVELS[overall];
  const sorted = [...flagged].sort((a, b) => rankOf(b.level) - rankOf(a.level));

  return (
    <Panel label="Status / summary" title="Crew health status" corners>
      <div className="flex items-start gap-2.5">
        <span
          className="mt-1 size-2 shrink-0 rounded-full"
          style={{ background: meta.hex, boxShadow: `0 0 14px 2px ${meta.hex}66` }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className={cn("text-[15px] font-medium", meta.text)}>{meta.label}</p>
            <span className="font-mono text-[9px] text-dim">{latestCount} indicators</span>
          </div>
          <p className="mt-0.5 text-[10.5px] leading-snug text-mute">{meta.action}</p>
        </div>
      </div>

      <div className="mt-3 space-y-1">
        {sorted.length === 0 && (
          <p className="rounded-md border border-aurora/25 bg-aurora/6 px-2.5 py-2 text-[10.5px] leading-snug text-aurora/90">
            Every recorded indicator is inside its configured range.
          </p>
        )}
        {sorted.slice(0, 4).map((reading) => (
          <div
            key={reading.metric.id}
            className="flex items-center justify-between gap-2 rounded-md border border-line/70 bg-deep/40 px-2 py-1.5"
          >
            <div className="flex min-w-0 items-center gap-1.5">
              <LevelDot level={reading.level} />
              <span className="truncate text-[10.5px] text-ink/90">{reading.metric.short}</span>
            </div>
            <span className="flex shrink-0 items-center gap-1.5">
              <span className="num text-[10.5px] text-mute">
                {formatMetricValue(reading.metric, reading.value)}
              </span>
              <LevelBadge level={reading.level} size="xs" showDot={false} />
            </span>
          </div>
        ))}
        {sorted.length > 4 && (
          <p className="px-1 pt-0.5 font-mono text-[9px] text-dim">
            +{sorted.length - 4} more flagged readings
          </p>
        )}
      </div>

      <div className="mt-3 border-t border-line/60 pt-2.5">
        <div className="flex items-baseline justify-between">
          <span className="label-tech">Assessments this week</span>
          <span className="num text-[10px] text-ink">
            {completedThisWeek}/{totalAssessments}
          </span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-deep/80">
          <div
            className="h-full rounded-full bg-signal/70"
            style={{ width: `${(completedThisWeek / totalAssessments) * 100}%` }}
          />
        </div>
        <Link
          href="/assessment"
          className="mt-2.5 flex items-center justify-between rounded-md border border-signal/30 bg-signal/6 px-2.5 py-1.5 text-[10.5px] text-signal transition-colors hover:border-signal/60 hover:bg-signal/12"
        >
          <span className="inline-flex items-center gap-1.5">
            <ClipboardCheck className="size-3" />
            Run a guided assessment
          </span>
          <ArrowUpRight className="size-3" />
        </Link>
      </div>

      <p className="mt-2.5 font-mono text-[8.5px] tracking-[0.08em] text-dim">
        {lastReadingAt ? `Last sync ${formatRelative(lastReadingAt, MISSION.now)}` : "No readings"}
      </p>
    </Panel>
  );
}
