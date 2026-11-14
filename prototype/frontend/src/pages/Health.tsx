import { StatusPill } from "../components/StatusPill";
import { TrendChart } from "../components/TrendChart";
import { activityLabel, formatRelative } from "../lib/format";
import type { Snapshot } from "../types";

export function Health({ snapshot }: { snapshot: Snapshot }) {
  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <p className="eyebrow">Health</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Recent trends
          </h1>
          <p className="mt-1 text-sm text-muted">
            {snapshot.history.length} samples · activity {activityLabel(snapshot.device.activity)} ·
            updated {formatRelative(snapshot.device.last_reading_at)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="chip">{snapshot.device.scenario_label}</span>
          <StatusPill
            status={
              snapshot.overall.status === "paused"
                ? "inactive"
                : snapshot.overall.status
            }
            label={snapshot.overall.label}
          />
        </div>
      </div>

      {!snapshot.device.monitoring && (
        <div className="card p-4 text-sm text-muted">
          Monitoring is paused. Start the demo from Overview to add live readings.
        </div>
      )}
      {snapshot.device.monitoring && !snapshot.device.connected && (
        <div className="card p-4 text-sm text-warn">
          The wearable is disconnected. Charts show the last known readings.
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-2" aria-label="Vital sign trends">
        {snapshot.vitals.map((vital) => (
          <TrendChart key={vital.key} vital={vital} history={snapshot.history} />
        ))}
      </section>

      <section className="card p-4 sm:p-5" aria-label="Personal baselines">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="eyebrow">Personalization</p>
            <h2 className="section-title mt-1">Baselines</h2>
          </div>
          <p className="text-[11px] text-muted">
            Learned from valid, in-range readings only.
          </p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {snapshot.vitals.map((vital) => (
            <div key={vital.key} className="rounded-2xl bg-canvas p-3">
              <p className="text-[10px] font-semibold text-muted">{vital.label}</p>
              <p className="numeric mt-1.5 text-lg font-semibold">
                {vital.baseline.ready
                  ? `${vital.baseline.mean.toFixed(1)} ${vital.unit}`
                  : "Learning"}
              </p>
              <p className="mt-1 text-[10px] text-muted">
                {vital.baseline.samples} samples
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
