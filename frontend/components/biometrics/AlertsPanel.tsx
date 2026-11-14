import Link from "next/link";
import { ArrowUpRight, BellOff } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { LevelBadge } from "@/components/ui/Badge";
import { LEVELS } from "@/lib/health/levels";
import { formatNumber, formatRelative } from "@/lib/health/format";
import { getMetric } from "@/lib/data/metrics";
import { MISSION } from "@/lib/data/mission";
import { cn } from "@/lib/utils/cn";
import type { AlertRecord } from "@/types";

export function AlertsPanel({ alerts }: { alerts: AlertRecord[] }) {
  return (
    <Panel
      label="Alerts / recent"
      title="Threshold alerts"
      id="alerts"
      action={
        <Link
          href="/assessment"
          className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.12em] text-mute transition-colors hover:text-signal"
        >
          Review <ArrowUpRight className="size-2.5" />
        </Link>
      }
    >
      {alerts.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 py-5 text-center">
          <BellOff className="size-4 text-dim" />
          <p className="text-[10.5px] text-mute">No alerts recorded in this window.</p>
        </div>
      ) : (
        <ul className="space-y-1">
          {alerts.map((alert) => {
            const metric = getMetric(alert.metric);
            const meta = LEVELS[alert.level];
            return (
              <li
                key={alert.id}
                className={cn(
                  "flex items-start gap-2 rounded-md border border-line/60 bg-deep/40 px-2 py-1.5",
                  alert.level === "critical" && "border-danger/35 bg-danger/6",
                )}
              >
                <span className={cn("mt-1 size-1.5 shrink-0 rounded-full", meta.dot)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-1.5">
                    <span className="truncate text-[10.5px] text-ink/90">{metric.label}</span>
                    <span className="num shrink-0 text-[10px]" style={{ color: meta.hex }}>
                      {formatNumber(alert.value, metric.precision)} {metric.unit}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-1.5">
                    <span className="truncate font-mono text-[8.5px] uppercase tracking-[0.08em] text-dim">
                      {formatRelative(alert.ts, MISSION.now)} · {alert.subject}
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-dim">
                        {alert.source}
                      </span>
                      <LevelBadge level={alert.level} size="xs" showDot={false} />
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-2 border-t border-line/50 pt-2 text-[9px] leading-snug text-dim">
        Alerts reproduce the backend rule set: critical immediately, needs check-up after repeated
        readings, with a cooldown between repeats.
      </p>
    </Panel>
  );
}
