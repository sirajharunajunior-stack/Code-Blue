"use client";

import { cn } from "@/lib/utils/cn";

export const inputClass =
  "h-9 w-full rounded-md border border-line bg-deep/70 px-2.5 font-mono text-[13px] text-ink placeholder:text-dim/80 transition-colors hover:border-edge/70 focus:border-signal/60 focus:outline-none focus:ring-1 focus:ring-signal/25";

export const textareaClass =
  "min-h-[74px] w-full resize-y rounded-md border border-line bg-deep/70 px-2.5 py-2 font-sans text-[12px] leading-relaxed text-ink placeholder:text-dim/80 transition-colors hover:border-edge/70 focus:border-signal/60 focus:outline-none focus:ring-1 focus:ring-signal/25";

export function FieldShell({
  label,
  hint,
  error,
  unit,
  required,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  unit?: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-[11.5px] font-medium text-ink/90">
          {label}
          {required && <span className="ml-1 text-signal/70">*</span>}
          {unit && <span className="ml-1.5 font-mono text-[10px] text-dim">{unit}</span>}
        </label>
      </div>
      {children}
      {hint && !error && <p className="text-[10.5px] leading-snug text-dim">{hint}</p>}
      {error && <p className="text-[10.5px] leading-snug text-danger">{error}</p>}
    </div>
  );
}

/** 0–10 style scale selector: every step is a real, reachable control. */
export function ScaleField({
  value,
  onChange,
  min = 0,
  max = 10,
  labelLow,
  labelHigh,
}: {
  value: number | null;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  labelLow?: string;
  labelHigh?: string;
}) {
  const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1" role="radiogroup">
        {steps.map((step) => {
          const active = value === step;
          return (
            <button
              key={step}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(step)}
              className={cn(
                "h-8 flex-1 rounded-[4px] border font-mono text-[11px] tabular-nums transition-colors",
                active
                  ? "border-signal/70 bg-signal/15 text-signal shadow-[0_0_16px_-8px_rgba(79,240,228,0.8)]"
                  : "border-line bg-deep/60 text-mute hover:border-edge hover:text-ink",
              )}
            >
              {step}
            </button>
          );
        })}
      </div>
      {(labelLow || labelHigh) && (
        <div className="flex justify-between font-mono text-[9px] uppercase tracking-[0.1em] text-dim">
          <span>{labelLow ?? min}</span>
          <span>{labelHigh ?? max}</span>
        </div>
      )}
    </div>
  );
}

export function ToggleField({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition-colors",
        checked ? "border-amber/45 bg-amber/8" : "border-line bg-deep/50 hover:border-edge",
      )}
    >
      <span className={cn("text-[11.5px]", checked ? "text-ink" : "text-mute")}>{label}</span>
      <span
        className={cn(
          "relative h-4 w-7 shrink-0 rounded-full border transition-colors",
          checked ? "border-amber/60 bg-amber/25" : "border-line bg-panel-2",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-2.5 rounded-full transition-all",
            checked ? "left-3.5 bg-amber" : "left-0.5 bg-dim",
          )}
        />
      </span>
    </button>
  );
}
