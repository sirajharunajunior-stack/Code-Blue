import { Panel } from "@/components/ui/Panel";
import { LevelBadge, SourceTag } from "@/components/ui/Badge";
import { Meter } from "@/components/ui/Meter";
import { formatMetricValue, formatRelative } from "@/lib/health/format";
import { rankOf } from "@/lib/health/levels";
import { MISSION } from "@/lib/data/mission";
import type { LatestReading } from "@/types";

/** Newest value of every recorded vital, worst first. */
export function RecentMeasurements({ readings }: { readings: LatestReading[] }) {
  const rows = [...readings].sort((a, b) => rankOf(b.level) - rankOf(a.level) || a.metric.id.localeCompare(b.metric.id));

  return (
    <Panel
      label="Measurements / latest"
      title="Recent measurements"
      flush
      action={<span className="font-mono text-[9px] text-dim">{rows.length} metrics</span>}
    >
      <div className="scroll-thin max-h-[268px] overflow-x-auto overflow-y-auto">
        <table className="w-full min-w-[480px] border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-panel-2/95 backdrop-blur">
            <tr className="border-b border-line/70">
              {["Indicator", "Value", "Level", "Source", "Updated"].map((head) => (
                <th
                  key={head}
                  className="px-2.5 py-1.5 font-mono text-[8.5px] font-normal uppercase tracking-[0.12em] text-dim"
                >
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((reading) => (
              <tr key={reading.metric.id} className="border-b border-line/40 last:border-0 hover:bg-panel-2/50">
                <td className="px-2.5 py-1.5">
                  <div className="text-[10.5px] text-ink/90">{reading.metric.label}</div>
                  <div className="mt-0.5 w-24">
                    <Meter metric={reading.metric} value={reading.value} level={reading.level} compact />
                  </div>
                </td>
                <td className="whitespace-nowrap px-2.5 py-1.5">
                  <span className="num text-[11px] text-ink">
                    {formatMetricValue(reading.metric, reading.value)}
                  </span>
                </td>
                <td className="px-2.5 py-1.5">
                  <LevelBadge level={reading.level} size="xs" />
                </td>
                <td className="px-2.5 py-1.5">
                  <SourceTag source={reading.metric.source} />
                </td>
                <td className="whitespace-nowrap px-2.5 py-1.5 font-mono text-[9px] text-dim">
                  {formatRelative(reading.ts, MISSION.now)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
