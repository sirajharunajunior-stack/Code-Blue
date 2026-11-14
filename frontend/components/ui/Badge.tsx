import { cn } from "@/lib/utils/cn";
import { LEVELS } from "@/lib/health/levels";
import type { HealthLevel, MeasurementSource } from "@/types";

export function Chip({
  children,
  className,
  tone = "default",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "default" | "accent" | "muted";
}) {
  return (
    <span
      className={cn(
        "chip",
        tone === "accent" && "border-signal/35 bg-signal/8 text-signal",
        tone === "muted" && "border-line/60 text-dim",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Dot + label for a single health level. */
export function LevelBadge({
  level,
  size = "sm",
  showDot = true,
  className,
}: {
  level: HealthLevel;
  size?: "xs" | "sm";
  showDot?: boolean;
  className?: string;
}) {
  const meta = LEVELS[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-mono uppercase tracking-[0.12em]",
        meta.border,
        meta.surface,
        meta.text,
        size === "xs" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]",
        className,
      )}
      title={`${meta.label} — ${meta.action}`}
    >
      {showDot && <span className={cn("size-1.5 rounded-full", meta.dot)} />}
      {meta.short}
    </span>
  );
}

export function LevelDot({ level, className }: { level: HealthLevel; className?: string }) {
  return (
    <span
      className={cn("inline-block size-1.5 shrink-0 rounded-full", LEVELS[level].dot, className)}
      aria-label={LEVELS[level].label}
    />
  );
}

const SOURCE_META: Record<
  MeasurementSource,
  { label: string; title: string; className: string }
> = {
  sensor: {
    label: "SENSOR",
    title: "Read automatically from habitat or body sensors",
    className: "border-signal/30 text-signal/90",
  },
  dataset: {
    label: "RECORDED",
    title: "Recorded by the monitoring system in this demonstration dataset",
    className: "border-line text-mute",
  },
  "self-report": {
    label: "SELF-REPORT",
    title: "Entered by the crew member — not an instrument reading",
    className: "border-violet/35 text-violet",
  },
  manual: {
    label: "MANUAL",
    title: "Measured with equipment, then entered by hand",
    className: "border-amber/35 text-amber",
  },
};

/**
 * Provenance marker. Every number in ASTRA can be traced to a source, and
 * self-reported values are never presented as instrument measurements.
 */
export function SourceTag({
  source,
  className,
}: {
  source: MeasurementSource;
  className?: string;
}) {
  const meta = SOURCE_META[source];
  return (
    <span
      title={meta.title}
      className={cn(
        "inline-flex items-center rounded-sm border bg-deep/60 px-1 py-px font-mono text-[8px] tracking-[0.14em]",
        meta.className,
        className,
      )}
    >
      {meta.label}
    </span>
  );
}

export function DemoTag({ className }: { className?: string }) {
  return (
    <span
      title="Demonstration data — not real astronaut records"
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border border-violet/40 bg-violet/10 px-1.5 py-px font-mono text-[9px] tracking-[0.16em] text-violet",
        className,
      )}
    >
      DEMO
    </span>
  );
}
