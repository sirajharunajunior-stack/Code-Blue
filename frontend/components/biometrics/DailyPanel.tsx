import Link from "next/link";
import { ArrowUpRight, Moon, Dumbbell } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { LevelBadge } from "@/components/ui/Badge";
import { DailyBars } from "@/components/charts/TrendChart";
import { MISSION_LIMITS, FLIGHT_DAY_OFFSET } from "@/lib/data/mission";
import { formatNumber } from "@/lib/health/format";
import type { DailyRecord } from "@/types";

/** Sleep and exercise against the configured daily targets. */
export function DailyPanel({ daily }: { daily: DailyRecord[] }) {
  const data = daily.map((record) => ({
    label: `FD${FLIGHT_DAY_OFFSET + record.day}`,
    sleep: record.sleepHours,
    exercise: record.exerciseHours,
    sleepTarget: MISSION_LIMITS.sleepTarget,
    exerciseTarget: MISSION_LIMITS.exerciseTarget,
  }));

  const last = daily[daily.length - 1];

  return (
    <Panel
      label="Daily / countermeasures"
      title="Sleep & exercise"
      action={
        <Link
          href="/hazards"
          className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.12em] text-mute hover:text-signal"
        >
          Hazards <ArrowUpRight className="size-2.5" />
        </Link>
      }
    >
      <div className="space-y-2.5">
        <div>
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[10.5px] text-ink/90">
              <Moon className="size-3 text-violet" /> Sleep
            </span>
            <span className="flex items-center gap-1.5">
              <span className="num text-[11px] text-ink">
                {last?.sleepHours !== null && last?.sleepHours !== undefined
                  ? `${formatNumber(last.sleepHours, 1)} h`
                  : "—"}
              </span>
              {last && <LevelBadge level={last.levels.sleep} size="xs" showDot={false} />}
            </span>
          </div>
          <DailyBars
            data={data.map((d) => ({ label: d.label, a: d.sleep, b: d.sleepTarget }))}
            series={{ a: "Sleep", b: "Target", colorA: "#8b9cff", colorB: "#35d07f" }}
            height={86}
            unit="h"
          />
        </div>

        <div className="border-t border-line/60 pt-2">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[10.5px] text-ink/90">
              <Dumbbell className="size-3 text-signal" /> Exercise
            </span>
            <span className="flex items-center gap-1.5">
              <span className="num text-[11px] text-ink">
                {last?.exerciseHours !== null && last?.exerciseHours !== undefined
                  ? `${formatNumber(last.exerciseHours, 1)} h`
                  : "—"}
              </span>
              {last && <LevelBadge level={last.levels.exercise} size="xs" showDot={false} />}
            </span>
          </div>
          <DailyBars
            data={data.map((d) => ({ label: d.label, a: d.exercise, b: d.exerciseTarget }))}
            series={{ a: "Exercise", b: "Target", colorA: "#4ff0e4", colorB: "#35d07f" }}
            height={86}
            unit="h"
          />
        </div>
      </div>
      <p className="mt-1.5 font-mono text-[8.5px] leading-snug text-dim">
        Targets are configured demonstration values · last 7 flight days
      </p>
    </Panel>
  );
}
