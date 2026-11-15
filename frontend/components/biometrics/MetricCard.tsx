"use client";

import {
  Activity,
  Droplet,
  Gauge,
  HeartPulse,
  Minus,
  Thermometer,
  TrendingDown,
  TrendingUp,
  Wind,
} from "lucide-react";
import { Sparkline } from "@/components/ui/Sparkline";
import { LevelBadge, SourceTag } from "@/components/ui/Badge";
import { LEVELS } from "@/lib/health/levels";
import { formatDelta, formatNumber } from "@/lib/health/format";
import { cn } from "@/lib/utils/cn";
import type { LatestReading, MetricDef } from "@/types";

const ICONS: Record<string, React.ElementType> = {
  heart_rate: HeartPulse,
  bp_systolic: Gauge,
  spo2: Droplet,
  body_temp: Thermometer,
  resp_rate: Activity,
  cabin_co2: Wind,
};

/**
 * Compact biometric card: one indicator, its newest value, trend, level and
 * provenance. Clicking it drives the main trend chart.
 */
export function MetricCard({
  primary,
  secondary,
  spark,
  delta,
  active,
  onSelect,
  tone = "default",
}: {
  primary: LatestReading;
  secondary?: LatestReading;
  spark: number[];
  delta: number | null;
  active: boolean;
  onSelect: () => void;
  tone?: "default" | "environment";
}) {
  const metric: MetricDef = primary.metric;
  const Icon = ICONS[metric.id] ?? Activity;
  const meta = LEVELS[primary.level];
  const Trend = delta === null || delta === 0 ? Minus : delta > 0 ? TrendingUp : TrendingDown;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "panel group relative overflow-hidden p-3 text-left transition-colors",
        active ? "border-signal/45 bg-signal/4" : "hover:border-edge/90",
      )}
    >
      <span
        className="absolute inset-x-0 top-0 h-px opacity-70"
        style={{ background: `linear-gradient(90deg, transparent, ${meta.hex}, transparent)` }}
      />

      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Icon className={cn("size-3.5 shrink-0", tone === "environment" ? "text-violet" : "text-signal/80")} />
          <span className="truncate font-mono text-[9.5px] uppercase tracking-[0.14em] text-mute">
            {metric.id === "bp_systolic" ? "Blood pressure" : metric.short}
          </span>
        </div>
        <LevelBadge level={primary.level} size="xs" />
      </div>

      <div className="mt-2 flex items-baseline gap-1">
        <span className="num text-[26px] leading-none text-ink">
          {primary.metric.id === "bp_systolic" && secondary
            ? `${formatNumber(primary.value, 0)}/${formatNumber(secondary.value, 0)}`
            : formatNumber(primary.value, metric.precision)}
        </span>
        <span className="font-mono text-[10px] text-dim">{metric.unit}</span>
      </div>

      <div className="mt-2 h-7">
        <Sparkline values={spark} color={meta.hex} height={28} strokeWidth={1.2} />
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 font-mono text-[9px] text-mute">
          <Trend className="size-2.5 text-dim" />
          {delta === null ? "no baseline" : `${formatDelta(delta, metric.precision)} / 24h`}
        </span>
        <SourceTag source={metric.source} />
      </div>
    </button>
  );
}
