"use client";

import { ArrowRight, Clock3, Repeat } from "lucide-react";
import { LevelBadge } from "@/components/ui/Badge";
import { CATEGORY_LABELS, MISSION } from "@/lib/data";
import { formatRelative } from "@/lib/health/format";
import { cn } from "@/lib/utils/cn";
import { dueWindowDays } from "@/lib/assessment-store";
import type { AssessmentStatus } from "@/lib/assessment-store";
import type { AssessmentDefinition as Definition } from "@/types";

/** "daily" / "weekly" cadence expressed as a due window in days. */
export function AssessmentCard({
  assessment,
  status,
  onStart,
}: {
  assessment: Definition;
  status: AssessmentStatus;
  onStart: () => void;
}) {
  const window = dueWindowDays(assessment.cadence);
  const ageDays = status.lastCompletedAt ? (MISSION.now - status.lastCompletedAt) / 86400 : null;
  const due = window === null ? false : ageDays === null || ageDays > window;
  const overdue = window !== null && ageDays !== null && ageDays > window * 2;

  return (
    <button
      type="button"
      onClick={onStart}
      className="panel group flex h-full flex-col p-3 text-left transition-colors hover:border-signal/40"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-signal/70">
          {CATEGORY_LABELS[assessment.category]}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {status.lastLevel && <LevelBadge level={status.lastLevel} size="xs" />}
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em]",
              due
                ? overdue
                  ? "border-orange/40 bg-orange/10 text-orange"
                  : "border-amber/40 bg-amber/8 text-amber"
                : "border-aurora/35 bg-aurora/8 text-aurora",
            )}
          >
            {window === null ? "available" : due ? (overdue ? "overdue" : "due") : "current"}
          </span>
        </div>
      </div>

      <h3 className="mt-1.5 text-[12.5px] font-medium leading-snug text-ink group-hover:text-signal">
        {assessment.shortName}
      </h3>
      <p className="mt-1 line-clamp-3 text-[10.5px] leading-relaxed text-mute">{assessment.description}</p>

      <div className="mt-auto space-y-1.5 pt-2.5">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[9px] text-dim">
          <span className="inline-flex items-center gap-1">
            <Clock3 className="size-2.5" /> {assessment.durationMinutes} min
          </span>
          <span className="inline-flex items-center gap-1">
            <Repeat className="size-2.5" /> {assessment.steps.length} steps
          </span>
          <span className="truncate">{status.lastCompletedAt ? formatRelative(status.lastCompletedAt, MISSION.now) : "never"}</span>
        </div>
        <span className="flex items-center justify-between border-t border-line/60 pt-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-mute group-hover:text-signal">
          {status.lastCompletedAt ? "Repeat assessment" : "Start assessment"}
          <ArrowRight className="size-2.5" />
        </span>
      </div>
    </button>
  );
}
