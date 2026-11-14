"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Info,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Chip, LevelBadge, LevelDot } from "@/components/ui/Badge";
import { AssessmentCard } from "@/components/assessment/AssessmentCard";
import { AssessmentRunner } from "@/components/assessment/AssessmentRunner";
import { useCrew } from "@/components/providers/CrewProvider";
import { useAssessments, isAssessmentDue } from "@/lib/assessment-store";
import { ASSESSMENTS, CATEGORY_LABELS } from "@/lib/data/assessments";
import { MISSION } from "@/lib/data/mission";
import { formatRelative } from "@/lib/health/format";
import { LEVELS } from "@/lib/health/levels";
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

  /* A body-system or hazard panel can hand over an assessment to focus. */
  useEffect(() => {
    const focus = window.sessionStorage.getItem(FOCUS_KEY);
    if (!focus) return;
    window.sessionStorage.removeItem(FOCUS_KEY);
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

  const recent = [...assessments.results].sort((a, b) => b.submittedAt - a.submittedAt).slice(0, 5);

  const nextDue =
    dueRows[0] ??
    [...statusRows]
      .filter(({ status }) => status.lastCompletedAt)
      .sort((a, b) => (a.status.lastCompletedAt ?? 0) - (b.status.lastCompletedAt ?? 0))[0];

  return (
    <div className="space-y-3">
      <PageHeader
        index="04"
        section="Guided clinical self-assessment"
        title="Assessment queue"
        description="Structured, step-by-step health checks. Every step states what to do, why it matters and what happens to the result — no free-text guessing."
        meta={
          <>
            <Chip tone="accent">{subject.name}</Chip>
            <Chip>{ASSESSMENTS.length} assessments</Chip>
            <Chip tone={dueCount ? "default" : "muted"}>
              {dueCount ? `${dueCount} due` : "All current"}
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
            {nextDue
              ? `${dueRows.length ? "Continue" : "Repeat"} ${nextDue.assessment.shortName}`
              : "Start daily check"}
          </Button>
        }
      />

      <div className="grid gap-2.5 xl:grid-cols-12">
        {/* ------------------------------------------------ assessment library */}
        <div className="space-y-2.5 xl:col-span-8">
          <Panel
            label="Library / filter"
            title="Available assessments"
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
              <p className="px-3 pb-3 text-[10.5px] text-mute">No assessments in this category.</p>
            )}
          </Panel>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <Panel label="Queue / cadence" title="What is due next" flush>
              <ul className="divide-y divide-line/40">
                {ASSESSMENTS.slice(0, 4).map((assessment) => {
                  const status = assessments.statusFor(assessment.id);
                  return (
                    <li key={assessment.id} className="flex items-center gap-2 px-2.5 py-1.5">
                      <LevelDot level={status.lastLevel ?? "normal"} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[10.5px] text-ink/90">{assessment.shortName}</p>
                        <p className="font-mono text-[8.5px] uppercase tracking-[0.08em] text-dim">
                          {assessment.cadence}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-[8.5px] text-dim">
                        {status.lastCompletedAt
                          ? formatRelative(status.lastCompletedAt, MISSION.now)
                          : "never"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setOpenId(assessment.id)}
                        className="shrink-0 rounded border border-line px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-mute transition-colors hover:border-signal/50 hover:text-signal"
                      >
                        Start
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Panel>

            <Panel label="Progress / submissions" title="Recent submissions" flush>
              {recent.length === 0 ? (
                <div className="flex flex-col items-center gap-1.5 px-3 py-6 text-center">
                  <ClipboardCheck className="size-4 text-dim" />
                  <p className="text-[10.5px] text-mute">Nothing submitted in this session yet.</p>
                  <p className="font-mono text-[8.5px] text-dim">
                    Scheduled checks below show the demonstration record&apos;s last completion.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-line/40">
                  {recent.map((result, index) => {
                    const definition = ASSESSMENTS.find((a) => a.id === result.assessmentId);
                    return (
                      <li
                        key={`${result.assessmentId}-${result.submittedAt}-${index}`}
                        className="flex items-center gap-2 px-2.5 py-1.5"
                      >
                        <CheckCircle2 className="size-3 shrink-0 text-aurora/80" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[10.5px] text-ink/90">
                            {definition?.shortName ?? result.assessmentId}
                          </p>
                          <p className="font-mono text-[8.5px] text-dim">
                            {formatRelative(result.submittedAt, MISSION.now)} · {result.answers.length} entries
                          </p>
                        </div>
                        <LevelBadge level={result.level} size="xs" />
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          </div>
        </div>

        {/* ------------------------------------------------ supporting panels */}
        <div className="space-y-2.5 xl:col-span-4">
          <Panel label="Progress / week" title="Completion" corners>
            <div className="flex items-baseline justify-between">
              <span className="num text-[26px] leading-none text-ink">
                {assessments.completedThisWeek}
                <span className="text-[14px] text-dim">/{ASSESSMENTS.length}</span>
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-dim">assessments</span>
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

          <Panel label="Safety / escalation" title="Before you begin" corners>
            <ul className="space-y-2">
              <li className="flex gap-2">
                <Info className="mt-px size-3 shrink-0 text-signal/80" />
                <p className="text-[10px] leading-relaxed text-mute">
                  Answer for the last 24 hours unless the step says otherwise. Estimates are acceptable —
                  record what actually happened.
                </p>
              </li>
              <li className="flex gap-2">
                <AlertTriangle className="mt-px size-3 shrink-0 text-amber" />
                <p className="text-[10px] leading-relaxed text-mute">
                  A guided assessment classifies values against configured reference ranges. It does not
                  diagnose a condition and does not replace the flight surgeon.
                </p>
              </li>
              <li className="flex gap-2">
                <ShieldAlert className="mt-px size-3 shrink-0 text-danger" />
                <p className="text-[10px] leading-relaxed text-mute">
                  Chest pain, breathlessness at rest, fainting, new vision loss or thoughts of self-harm are
                  immediate escalations — contact the flight surgeon and open the emergency checklist now.
                </p>
              </li>
            </ul>
            <div className="mt-2.5 rounded-md border border-line/70 bg-deep/40 p-2">
              <div className="label-tech mb-1">Recorded findings</div>
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

          <Panel label="Link / explorer" title="Not sure which to run?" action={<Clock3 className="size-3 text-dim" />}>
            <p className="text-[10.5px] leading-relaxed text-mute">
              Pick a body system in the digital human explorer to see the indicators it tracks and the
              assessment that covers it.
            </p>
            <div className="mt-2 flex gap-1.5">
              <Button href="/digital-human" variant="outline" size="sm" className="flex-1">
                Open body map <ArrowUpRight className="size-3" />
              </Button>
              <Button href="/biometrics" variant="subtle" size="sm" className="flex-1">
                View vitals
              </Button>
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
