"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Info, ShieldAlert, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Badge";
import { AssessmentCard } from "@/components/assessment/AssessmentCard";
import { AssessmentRunner } from "@/components/assessment/AssessmentRunner";
import { useCrew } from "@/components/providers/CrewProvider";
import { useAssessments, isAssessmentDue } from "@/lib/assessment-store";
import { ASSESSMENTS, CATEGORY_LABELS, MISSION } from "@/lib/data";
import { formatRelative } from "@/lib/health/format";
import { LEVELS } from "@/lib/health/levels";
import { takeSession } from "@/lib/utils/session";
import { cn } from "@/lib/utils/cn";
import type { AssessmentCategory } from "@/types";

const FOCUS_KEY = "astra:focus-assessment";

type Filter = "all" | AssessmentCategory;

const CATEGORIES: Filter[] = [
  "all",
  "cardiovascular",
  "metabolic",
  "behavioural",
  "environmental",
  "musculoskeletal",
  "neuro",
];

export function AssessmentScreen() {
  const { subjectId, subject } = useCrew();
  const assessments = useAssessments(subjectId);
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const pendingFocus = useRef<string | null | undefined>(undefined);

  /* A body-system or hazard panel can hand over a check to focus. */
  useEffect(() => {
    if (pendingFocus.current === undefined) {
      pendingFocus.current = takeSession(FOCUS_KEY);
    }
    const focus = pendingFocus.current;
    if (!focus) return;
    if (!ASSESSMENTS.some((a) => a.id === focus)) return;
    const timer = window.setTimeout(() => setOpenId(focus), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const visible = useMemo(
    () => (filter === "all" ? ASSESSMENTS : ASSESSMENTS.filter((a) => a.category === filter)),
    [filter],
  );

  const statusRows = ASSESSMENTS.map((assessment) => ({
    assessment,
    status: assessments.statusFor(assessment.id),
  }));
  const dueRows = statusRows
    .filter(({ assessment, status }) => isAssessmentDue(assessment.cadence, status.lastCompletedAt))
    .sort((a, b) => (a.status.lastCompletedAt ?? 0) - (b.status.lastCompletedAt ?? 0));
  const dueCount = dueRows.length;

  const focused = ASSESSMENTS.find((a) => a.id === openId) ?? null;
  const defaultAssessment = ASSESSMENTS.find((a) => a.id === "sleep-mood") ?? ASSESSMENTS[0];

  const nextDue =
    dueRows[0] ??
    [...statusRows]
      .filter(({ status }) => status.lastCompletedAt)
      .sort((a, b) => (a.status.lastCompletedAt ?? 0) - (b.status.lastCompletedAt ?? 0))[0];

  return (
    <div className="space-y-3">
      <PageHeader
        index="04"
        section="Health checks"
        title="Short guided checks"
        description="Pick a check and follow the steps. Each one takes a few minutes."
        meta={
          <>
            <Chip tone="accent">{subject.name}</Chip>
            <Chip tone={dueCount ? "default" : "muted"}>
              {dueCount ? `${dueCount} due` : "All up to date"}
            </Chip>
            <Chip tone="muted">{assessments.completedThisWeek} this week</Chip>
          </>
        }
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setOpenId(nextDue?.assessment.id ?? defaultAssessment.id)}
          >
            <Sparkles className="size-3" />
            {nextDue ? `Start ${nextDue.assessment.shortName}` : "Start daily check"}
          </Button>
        }
      />

      <div className="grid gap-2.5 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <Panel
            title="Available checks"
            flush
            action={
              <div className="scroll-thin -my-1 overflow-x-auto">
                <div className="flex items-center gap-1 whitespace-nowrap py-1">
                  {CATEGORIES.map((category) => {
                    const active = filter === category;
                    const count =
                      category === "all"
                        ? ASSESSMENTS.length
                        : ASSESSMENTS.filter((a) => a.category === category).length;
                    if (count === 0) return null;
                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => setFilter(category)}
                        aria-pressed={active}
                        className={cn(
                          "rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] transition-colors",
                          active
                            ? "border-signal/55 bg-signal/12 text-signal"
                            : "border-line bg-deep/50 text-mute hover:border-edge hover:text-ink",
                        )}
                      >
                        {category === "all" ? "All" : CATEGORY_LABELS[category]}
                        <span className="ml-1 text-dim">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            }
          >
            <div className="grid gap-2 p-2.5 sm:grid-cols-2">
              <AnimatePresence initial={false} mode="popLayout">
                {visible.map((assessment) => (
                  <motion.div
                    key={assessment.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.16 }}
                  >
                    <AssessmentCard
                      assessment={assessment}
                      status={assessments.statusFor(assessment.id)}
                      onStart={() => setOpenId(assessment.id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {visible.length === 0 && (
              <p className="px-3 pb-3 text-[10.5px] text-mute">No checks in this category.</p>
            )}
          </Panel>
        </div>

        <div className="space-y-2.5 xl:col-span-4">
          <Panel title="This week" corners>
            <div className="flex items-baseline justify-between">
              <span className="num text-[26px] leading-none text-ink">
                {assessments.completedThisWeek}
                <span className="text-[14px] text-dim">/{ASSESSMENTS.length}</span>
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-dim">completed</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-deep/80">
              <div
                className="h-full rounded-full bg-signal/70"
                style={{ width: `${(assessments.completedThisWeek / ASSESSMENTS.length) * 100}%` }}
              />
            </div>
            <ul className="mt-2.5 space-y-1">
              {ASSESSMENTS.map((assessment) => {
                const status = assessments.statusFor(assessment.id);
                return (
                  <li key={assessment.id} className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          status.lastCompletedAt ? "bg-aurora" : "border border-edge bg-transparent",
                        )}
                      />
                      <span className="truncate text-[10px] text-mute">{assessment.shortName}</span>
                    </span>
                    <span className="shrink-0 font-mono text-[8.5px] text-dim">
                      {status.lastCompletedAt
                        ? formatRelative(status.lastCompletedAt, MISSION.now)
                        : "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel title="Before you start" corners>
            <ul className="space-y-2">
              <li className="flex gap-2">
                <Info className="mt-px size-3 shrink-0 text-signal/80" />
                <p className="text-[10px] leading-relaxed text-mute">
                  Answer for the last 24 hours unless the step says otherwise.
                </p>
              </li>
              <li className="flex gap-2">
                <AlertTriangle className="mt-px size-3 shrink-0 text-amber" />
                <p className="text-[10px] leading-relaxed text-mute">
                  Checks compare values with configured ranges. They do not diagnose a condition.
                </p>
              </li>
              <li className="flex gap-2">
                <ShieldAlert className="mt-px size-3 shrink-0 text-danger" />
                <p className="text-[10px] leading-relaxed text-mute">
                  Chest pain, breathlessness at rest, fainting, new vision loss or thoughts of self-harm
                  need the flight surgeon now.
                </p>
              </li>
            </ul>
            <div className="mt-2.5 rounded-md border border-line/70 bg-deep/40 p-2">
              <div className="label-tech mb-1">How results are marked</div>
              <div className="flex flex-wrap gap-1">
                {(["normal", "slightly_abnormal", "needs_checkup", "critical"] as const).map((level) => (
                  <span key={level} className="inline-flex items-center gap-1 font-mono text-[8px] text-dim">
                    <span className={cn("size-1.5 rounded-full", LEVELS[level].dot)} />
                    {LEVELS[level].label}
                  </span>
                ))}
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {focused && (
        <AssessmentRunner
          key={focused.id}
          assessment={focused}
          open={Boolean(focused)}
          onClose={() => setOpenId(null)}
          subjectId={subjectId}
        />
      )}
    </div>
  );
}
