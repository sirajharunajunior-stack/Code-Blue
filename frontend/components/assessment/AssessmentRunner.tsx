"use client";

import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Info,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { LevelBadge, SourceTag } from "@/components/ui/Badge";
import { FieldShell, ScaleField, ToggleField, inputClass, textareaClass } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { useAssessments } from "@/lib/assessment-store";
import { classifyValue, getMetric, MISSION } from "@/lib/data";
import { formatMetricValue, formatRelative } from "@/lib/health/format";
import { LEVELS } from "@/lib/health/levels";
import { cn } from "@/lib/utils/cn";
import type {
  AssessmentAnswer,
  AssessmentDefinition,
  AssessmentField,
  AssessmentResult,
  AssessmentStep,
  HealthLevel,
} from "@/types";

type Phase = "intro" | "form" | "review" | "done";
type FormValues = Record<string, string | number | boolean | undefined>;

function buildSchema(step: AssessmentStep) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of step.fields) {
    if (field.type === "number") {
      let schema = z.number({ message: "Enter a number" });
      if (field.min !== undefined) schema = schema.min(field.min, `Minimum ${field.min}${field.unit ? ` ${field.unit}` : ""}`);
      if (field.max !== undefined) schema = schema.max(field.max, `Maximum ${field.max}${field.unit ? ` ${field.unit}` : ""}`);
      shape[field.id] = field.required ? schema : schema.optional();
    } else if (field.type === "scale") {
      shape[field.id] = field.required
        ? z.number().min(field.min ?? 0).max(field.max ?? 10)
        : z.number().min(field.min ?? 0).max(field.max ?? 10).optional();
    } else if (field.type === "select") {
      shape[field.id] = field.required ? z.string().min(1, "Select an option") : z.string().optional();
    } else if (field.type === "boolean") {
      shape[field.id] = z.boolean().optional();
    } else {
      shape[field.id] = z.string().optional();
    }
  }

  return z.object(shape);
}

function cleanStepValues(step: AssessmentStep, values: FormValues) {
  const out: Record<string, unknown> = {};
  for (const field of step.fields) {
    const value = values[field.id];
    if (typeof value === "number" && Number.isNaN(value)) continue;
    if (value === "") continue;
    out[field.id] = value;
  }
  return out;
}

export function AssessmentRunner({
  assessment,
  open,
  onClose,
  subjectId,
}: {
  assessment: AssessmentDefinition;
  open: boolean;
  onClose: () => void;
  subjectId: string;
}) {
  const { push } = useToast();
  const { submit, statusFor } = useAssessments(subjectId);
  const [phase, setPhase] = useState<Phase>("intro");
  const [stepIndex, setStepIndex] = useState(0);
  const [result, setResult] = useState<AssessmentResult | null>(null);

  const form = useForm<FormValues>({ mode: "onSubmit" });
  /* `useWatch` rather than `form.watch()`: the hook only re-renders on value
     changes and is safe for the React Compiler. */
  const values = useWatch({ control: form.control }) as FormValues;
  const status = statusFor(assessment.id);
  const step = assessment.steps[stepIndex];
  const totalSteps = assessment.steps.length;

  const allAnswers = useMemo<AssessmentAnswer[]>(() => {
    const answers: AssessmentAnswer[] = [];
    for (const currentStep of assessment.steps) {
      for (const field of currentStep.fields) {
        const value = values[field.id];
        if (value === undefined || value === "" || (typeof value === "number" && Number.isNaN(value))) continue;
        answers.push({ fieldId: field.id, value });
      }
    }
    return answers;
  }, [assessment.steps, values]);

  const metricRows = allAnswers
    .map((answer) => {
      const field = assessment.steps.flatMap((s) => s.fields).find((f) => f.id === answer.fieldId);
      if (!field?.metricId) return null;
      const value = Number(answer.value);
      if (!Number.isFinite(value)) return null;
      const metric = getMetric(field.metricId);
      const level = classifyValue(field.metricId, value) ?? "normal";
      return { field, metric, value, level };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  const worstLevel: HealthLevel = metricRows.reduce<HealthLevel>(
    (worst, row) => (LEVELS[row.level].rank > LEVELS[worst].rank ? row.level : worst),
    "normal",
  );

  const goNext = async () => {
    if (phase === "intro") {
      setPhase("form");
      return;
    }
    if (phase === "review") return;

    /* Required fields first, so the crew sees a plain "Required" rather than a
       schema message about expecting a number. */
    let missing = false;
    for (const field of step.fields) {
      const value = values[field.id];
      const empty =
        value === undefined || value === "" || (typeof value === "number" && Number.isNaN(value));
      if (field.required && empty) {
        form.setError(field.id, { message: "Required" });
        missing = true;
      }
    }
    if (missing) return;

    const schema = buildSchema(step);
    const parsed = schema.safeParse(cleanStepValues(step, values));

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key) form.setError(key, { message: issue.message });
      }
      return;
    }

    for (const field of step.fields) form.clearErrors(field.id);

    if (stepIndex < totalSteps - 1) {
      setStepIndex((index) => index + 1);
    } else {
      setPhase("review");
    }
  };

  const goBack = () => {
    if (phase === "form" && stepIndex === 0) {
      setPhase("intro");
      return;
    }
    if (phase === "review") {
      setPhase("form");
      setStepIndex(totalSteps - 1);
      return;
    }
    setStepIndex((index) => Math.max(0, index - 1));
  };

  const handleSubmit = () => {
    const notes = String(values["notes"] ?? "").trim();
    const stored = submit({ assessmentId: assessment.id, answers: allAnswers, notes });
    setResult(stored);
    setPhase("done");
    push({
      title: "Assessment submitted",
      description: `${assessment.shortName} · ${LEVELS[stored.level].label}. Saved to this crew member's record.`,
      tone: stored.level === "normal" ? "success" : "warning",
    });
  };

  const progress =
    phase === "done" ? 100 : phase === "review" ? 100 : phase === "intro" ? 0 : ((stepIndex + 1) / totalSteps) * 100;

  return (
    <Modal
      open={open}
      onClose={onClose}
      label={`Assessment · ${assessment.category}`}
      title={assessment.name}
      width="max-w-2xl"
      footer={
        phase === "done" ? (
          <Button variant="primary" size="md" onClick={onClose}>
            <CheckCircle2 className="size-3.5" /> Done
          </Button>
        ) : (
          <>
            <Button
              variant="ghost"
              size="md"
              onClick={phase === "intro" ? onClose : goBack}
              className="mr-auto"
            >
              {phase === "intro" ? "Cancel" : <><ArrowLeft className="size-3.5" /> Back</>}
            </Button>
            {phase === "review" ? (
              <Button variant="primary" size="md" onClick={handleSubmit}>
                Submit assessment <CheckCircle2 className="size-3.5" />
              </Button>
            ) : (
              <Button variant="primary" size="md" onClick={goNext}>
                {phase === "intro" ? "Begin assessment" : stepIndex === totalSteps - 1 ? "Review answers" : "Continue"}
                <ArrowRight className="size-3.5" />
              </Button>
            )}
          </>
        )
      }
    >
      {/* progress */}
      {phase !== "done" && (
        <div className="mb-3">
          <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.12em] text-dim">
            <span>
              {phase === "intro" ? "Briefing" : phase === "review" ? "Review" : `Step ${stepIndex + 1} of ${totalSteps}`}
            </span>
            <span className="flex items-center gap-2">
              <Clock3 className="size-2.5" /> {assessment.durationMinutes} min
              {status.lastCompletedAt && (
                <span className="text-dim/80">· last {formatRelative(status.lastCompletedAt, MISSION.now)}</span>
              )}
            </span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-deep/80">
            <div className="h-full rounded-full bg-signal/70 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* ---------------- intro ---------------- */}
      {phase === "intro" && (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-md border border-line/70 bg-deep/40 p-2">
              <div className="label-tech mb-0.5">Duration</div>
              <p className="num text-[11px] text-ink">{assessment.durationMinutes} min</p>
            </div>
            <div className="rounded-md border border-line/70 bg-deep/40 p-2">
              <div className="label-tech mb-0.5">Cadence</div>
              <p className="text-[10.5px] leading-snug text-ink">{assessment.cadence}</p>
            </div>
            <div className="rounded-md border border-line/70 bg-deep/40 p-2">
              <div className="label-tech mb-0.5">Last completed</div>
              <p className="text-[10.5px] text-ink">
                {status.lastCompletedAt ? formatRelative(status.lastCompletedAt, MISSION.now) : "Never"}
              </p>
            </div>
          </div>

          <p className="text-[11.5px] leading-relaxed text-mute">{assessment.description}</p>

          <div className="rounded-md border border-signal/20 bg-signal/5 p-2.5">
            <div className="label-tech mb-1 text-signal/70">Why this matters</div>
            <p className="text-[11px] leading-relaxed text-ink/85">{assessment.why}</p>
          </div>

          <div>
            <div className="label-tech mb-1.5 flex items-center gap-1">
              <Wrench className="size-2.5" /> Equipment required
            </div>
            <ul className="flex flex-wrap gap-1">
              {assessment.equipment.map((item) => (
                <li key={item} className="chip">
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="label-tech mb-1.5">Instructions</div>
            <ol className="space-y-1">
              {assessment.instructions.map((instruction, index) => (
                <li key={instruction} className="flex gap-2 text-[10.5px] leading-relaxed text-mute">
                  <span className="mt-px grid size-4 shrink-0 place-items-center rounded-sm border border-line font-mono text-[8px] text-dim">
                    {index + 1}
                  </span>
                  {instruction}
                </li>
              ))}
            </ol>
          </div>

          <div className="flex items-start gap-1.5 rounded-md border border-line/70 bg-panel-2/40 p-2">
            <Info className="mt-px size-3 shrink-0 text-dim" />
            <p className="text-[9.5px] leading-relaxed text-dim">
              You can stop at any point. Nothing is saved until you confirm on the review step. Entries you
              type are saved as self-reported data.
            </p>
          </div>
        </div>
      )}

      {/* ---------------- form ---------------- */}
      {phase === "form" && (
        <div className="space-y-3">
          <div>
            <h3 className="text-[13px] font-medium text-ink">{step.title}</h3>
            <ul className="mt-1 space-y-0.5">
              {step.guidance.map((line) => (
                <li key={line} className="flex gap-1.5 text-[10.5px] leading-relaxed text-mute">
                  <span className="mt-[6px] size-1 shrink-0 rounded-full bg-signal/60" />
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {step.fields.map((field) => (
              <FieldItem
                key={field.id}
                field={field}
                form={form}
                value={values[field.id]}
                error={form.formState.errors[field.id]?.message as string | undefined}
                className={field.type === "text" || field.type === "boolean" ? "sm:col-span-2" : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* ---------------- review ---------------- */}
      {phase === "review" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 rounded-md border border-line/70 bg-deep/40 p-2.5">
            <div>
              <div className="label-tech mb-0.5">Result so far</div>
              <p className={cn("text-[12px] font-medium", LEVELS[worstLevel].text)}>
                {LEVELS[worstLevel].label}
              </p>
              <p className="mt-0.5 text-[10px] text-mute">{LEVELS[worstLevel].action}</p>
            </div>
            <LevelBadge level={worstLevel} size="sm" />
          </div>

          <div>
            <div className="label-tech mb-1.5">Your answers</div>
            <ul className="space-y-1">
              {allAnswers.map((answer) => {
                const field = assessment.steps.flatMap((s) => s.fields).find((f) => f.id === answer.fieldId);
                if (!field) return null;
                const metric = field.metricId ? getMetric(field.metricId) : null;
                const level = field.metricId && typeof answer.value === "number"
                  ? classifyValue(field.metricId, answer.value)
                  : null;

                const display =
                  typeof answer.value === "boolean"
                    ? answer.value
                      ? "Yes"
                      : "No"
                    : String(answer.value);

                return (
                  <li
                    key={answer.fieldId}
                    className="flex items-center justify-between gap-2 border-b border-line/40 py-1 last:border-0"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[10.5px] text-ink/85">{field.label}</span>
                      <span className="flex items-center gap-1">
                        <SourceTag source={metric?.source ?? "self-report"} />
                        {metric && level && (
                          <span className="font-mono text-[8.5px] text-dim">
                            normal {metric.rangeText?.normal ?? "—"} {metric.unit}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <span className="num text-[11px] text-ink">
                        {display}
                        {field.unit ? ` ${field.unit}` : ""}
                      </span>
                      {level && <LevelBadge level={level} size="xs" showDot={false} />}
                    </span>
                  </li>
                );
              })}
              {allAnswers.length === 0 && (
                <li className="py-2 text-[10.5px] text-mute">No values entered — you can go back and complete the steps.</li>
              )}
            </ul>
          </div>

          <div className="rounded-md border border-amber/25 bg-amber/5 p-2.5">
            <div className="label-tech mb-1 flex items-center gap-1 text-amber/80">
              <ShieldAlert className="size-2.5" /> What happens next
            </div>
            <p className="text-[10.5px] leading-relaxed text-ink/80">{assessment.followUp}</p>
          </div>

          <div className="flex items-start gap-1.5 text-[9.5px] leading-relaxed text-dim">
            <AlertTriangle className="mt-px size-3 shrink-0" />
            This entry is crew-reported data. It does not confirm or rule out any condition.
          </div>
        </div>
      )}

      {/* ---------------- done ---------------- */}
      {phase === "done" && result && (
        <div className="space-y-3">
          <div className="flex flex-col items-center gap-2 py-2 text-center">
            <span
              className="grid size-10 place-items-center rounded-full border"
              style={{
                borderColor: `${LEVELS[result.level].hex}66`,
                background: `${LEVELS[result.level].hex}14`,
                color: LEVELS[result.level].hex,
              }}
            >
              <CheckCircle2 className="size-5" />
            </span>
            <div>
              <p className="text-[13px] font-medium text-ink">Recorded</p>
              <p className="mt-0.5 text-[10.5px] text-mute">
                {assessment.name} · {formatRelative(result.submittedAt, MISSION.now)}
              </p>
            </div>
            <LevelBadge level={result.level} size="sm" />
          </div>

          {metricRows.length > 0 && (
            <div className="rounded-md border border-line/70 bg-deep/40 p-2.5">
              <div className="label-tech mb-1.5">Measured values</div>
              <ul className="space-y-1">
                {metricRows.map((row) => (
                  <li key={row.field.id} className="flex items-center justify-between gap-2">
                    <span className="text-[10.5px] text-ink/85">{row.metric.label}</span>
                    <span className="flex items-center gap-1.5">
                      <span className="num text-[10.5px] text-mute">
                        {formatMetricValue(row.metric, row.value)}
                      </span>
                      <LevelBadge level={row.level} size="xs" showDot={false} />
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-[9px] leading-snug text-dim">
                Classified against the configured reference ranges. Not a diagnosis.
              </p>
            </div>
          )}

          <div className="rounded-md border border-amber/25 bg-amber/5 p-2.5">
            <div className="label-tech mb-1 flex items-center gap-1 text-amber/80">
              <ShieldAlert className="size-2.5" /> What happens next
            </div>
            <p className="text-[10.5px] leading-relaxed text-ink/80">{assessment.followUp}</p>
          </div>

          {result.level === "critical" && (
            <div className="rounded-md border border-danger/40 bg-danger/8 p-2.5">
              <p className="flex items-center gap-1.5 text-[10.5px] font-medium text-danger">
                <AlertTriangle className="size-3" /> Immediate escalation triggered
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-ink/80">
                One or more values are beyond the critical threshold. Contact the flight surgeon now and follow
                the emergency medical checklist.
              </p>
            </div>
          )}

          <div className="flex items-center gap-1.5 rounded-md border border-line/70 px-2 py-1.5">
            <ClipboardCheck className="size-3 text-signal/70" />
            <p className="text-[9.5px] text-dim">
              Stored locally for this demonstration. A live deployment posts to the flight-surgeon queue.
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}

/** Renders one field with the control that matches its type. */
function FieldItem({
  field,
  form,
  value,
  error,
  className,
}: {
  field: AssessmentField;
  form: ReturnType<typeof useForm<FormValues>>;
  value: string | number | boolean | undefined;
  error?: string;
  className?: string;
}) {
  const id = `field-${field.id}`;

  if (field.type === "boolean") {
    return (
      <div className={className}>
        <ToggleField
          checked={Boolean(value)}
          onChange={(checked) => form.setValue(field.id, checked, { shouldValidate: false })}
          label={field.label}
        />
        {error && <p className="mt-1 text-[10.5px] text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <FieldShell
      label={field.label}
      hint={field.help}
      unit={field.unit}
      error={error}
      required={field.required}
      htmlFor={field.type === "scale" ? undefined : id}
      className={className}
    >
      {field.type === "number" && (
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          placeholder={field.placeholder ?? (field.min !== undefined ? `${field.min}–${field.max}` : undefined)}
          className={inputClass}
          {...form.register(field.id, { valueAsNumber: true })}
        />
      )}

      {field.type === "scale" && (
        <ScaleField
          value={typeof value === "number" ? value : null}
          onChange={(next) => form.setValue(field.id, next, { shouldValidate: false })}
          min={field.min ?? 0}
          max={field.max ?? 10}
          labelLow={`${field.min ?? 0} · lowest`}
          labelHigh={`${field.max ?? 10} · highest`}
          ariaLabel={field.label}
        />
      )}

      {field.type === "select" && (
        <select id={id} className={inputClass} {...form.register(field.id)}>
          <option value="">Select…</option>
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}

      {field.type === "text" && (
        <textarea
          id={id}
          rows={3}
          placeholder={field.placeholder}
          className={textareaClass}
          {...form.register(field.id)}
        />
      )}
    </FieldShell>
  );
}
