import { cn } from "@/lib/utils/cn";
import { LEVELS, positionInRange } from "@/lib/health/levels";
import { formatNumber } from "@/lib/health/format";
import type { HealthLevel, MetricDef } from "@/types";

/**
 * Horizontal reference scale for one metric: normal band, warning band and the
 * current value. This is how a crew member reads "how far outside normal am I"
 * without interpreting a raw threshold.
 */
export function Meter({
  metric,
  value,
  level,
  className,
  compact,
}: {
  metric: MetricDef;
  value: number | null;
  level: HealthLevel;
  className?: string;
  compact?: boolean;
}) {
  const lo = metric.critLow ?? metric.warnLow ?? metric.normalLo;
  const hi = metric.critHigh ?? metric.warnHigh ?? metric.normalHi;

  if (lo === null || hi === null || value === null) {
    return (
      <div className={cn("h-1 w-full rounded-full bg-line/60", className)} aria-hidden>
        <div className="h-full w-1/3 rounded-full bg-edge/60" />
      </div>
    );
  }

  const normalStart = positionInRange(metric.normalLo ?? lo, lo, hi);
  const normalEnd = positionInRange(metric.normalHi ?? hi, lo, hi);
  const marker = positionInRange(value, lo, hi);
  const meta = LEVELS[level];

  return (
    <div className={cn("relative", className)}>
      <div className={cn("relative w-full overflow-hidden rounded-full bg-deep/80", compact ? "h-1" : "h-1.5")}>
        {/* warning band */}
        <div className="absolute inset-y-0 left-0 w-full bg-amber/12" />
        {/* normal band */}
        <div
          className="absolute inset-y-0 bg-aurora/25"
          style={{ left: `${normalStart}%`, width: `${Math.max(2, normalEnd - normalStart)}%` }}
        />
      </div>
      <div
        className="absolute -top-[3px] h-[calc(100%+6px)] w-px"
        style={{ left: `${marker}%`, background: meta.hex }}
        aria-hidden
      >
        <span
          className="absolute -top-[2px] left-1/2 size-[3px] -translate-x-1/2 rounded-full"
          style={{ background: meta.hex }}
        />
      </div>
      {!compact && (
        <div className="mt-1 flex justify-between font-mono text-[9px] text-dim">
          <span>{formatNumber(lo, metric.precision)}</span>
          <span className={cn("uppercase tracking-[0.1em]", meta.text)}>{meta.short}</span>
          <span>{formatNumber(hi, metric.precision)}</span>
        </div>
      )}
    </div>
  );
}
