import Link from "next/link";
import { ArrowUpRight, Radiation } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { LevelBadge } from "@/components/ui/Badge";
import { formatNumber } from "@/lib/health/format";
import type { RadiationSummary } from "@/lib/data";

export function RadiationPanel({ summary }: { summary: RadiationSummary }) {
  const percent = Math.min(100, summary.percentOfLimit);

  return (
    <Panel title="Radiation" action={<LevelBadge level={summary.levelToday} size="xs" />}>
      <div className="flex items-center gap-2">
        <Radiation className="size-4 text-violet" />
        <div className="flex items-baseline gap-1">
          <span className="num text-[22px] leading-none text-ink">
            {formatNumber(summary.cumulative, 2)}
          </span>
          <span className="font-mono text-[10px] text-dim">/ {summary.limit} mSv</span>
        </div>
        <span className="ml-auto num text-[10px] text-violet">{formatNumber(percent, 1)}%</span>
      </div>

      <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-deep/80">
        <div className="absolute inset-y-0 left-0 w-full bg-violet/10" />
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-violet/70"
          style={{ width: `${percent > 0 ? Math.max(1.5, percent) : 0}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between font-mono text-[8.5px] text-dim">
        <span>0</span>
        <span>{formatNumber(percent, 0)}% of career limit</span>
        <span>{summary.limit} mSv</span>
      </div>

      <dl className="mt-2.5 space-y-1 border-t border-line/60 pt-2 font-mono text-[9.5px]">
        <div className="flex justify-between">
          <dt className="text-dim">Remaining</dt>
          <dd className="num text-ink">{formatNumber(summary.remaining, 2)} mSv</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-dim">Average / day (7d)</dt>
          <dd className="num text-ink">{formatNumber(summary.avgDaily, 2)} mSv</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-dim">Days to limit</dt>
          <dd className="num text-ink">
            {summary.projectedDaysToLimit !== null ? `${summary.projectedDaysToLimit}` : "—"}
          </dd>
        </div>
      </dl>

      <Link
        href="/hazards"
        className="mt-2.5 flex items-center justify-between rounded-md border border-violet/25 bg-violet/6 px-2 py-1.5 text-[10px] text-violet transition-colors hover:border-violet/50"
      >
        How we reduce exposure
        <ArrowUpRight className="size-3" />
      </Link>
    </Panel>
  );
}
