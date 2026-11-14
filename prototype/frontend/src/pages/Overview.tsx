import { AlertCard } from "../components/AlertCard";
import { DemoControls } from "../components/DemoControls";
import { StatusPill, toneForStatus } from "../components/StatusPill";
import { VitalCard } from "../components/VitalCard";
import {
  activityLabel,
  cx,
  formatClock,
  formatRelative,
} from "../lib/format";
import type { Scenario, Snapshot } from "../types";

const OVERALL_DOT: Record<string, string> = {
  normal: "bg-emerald-300",
  warning: "bg-amber-300",
  critical: "bg-rose-300",
  no_signal: "bg-slate-300",
  paused: "bg-slate-300",
};

interface OverviewProps {
  snapshot: Snapshot;
  busy: string | null;
  onStart: () => void;
  onStop: () => void;
  onScenario: (scenario: Scenario) => void;
  onDisconnect: () => void;
  onReconnect: () => void;
  onOpenAlerts: () => void;
}

export function Overview({
  snapshot,
  busy,
  onStart,
  onStop,
  onScenario,
  onDisconnect,
  onReconnect,
  onOpenAlerts,
}: OverviewProps) {
  const active = snapshot.active_alerts;
  const critical = active.filter((alert) => alert.severity === "critical").length;
  const recent = snapshot.alerts.slice(0, 3);
  const aiMode = snapshot.ai.enabled
    ? "Monitoring brief · AI ready"
    : "Monitoring brief · fallback";
  const overallTone = toneForStatus(
    snapshot.overall.status === "paused" ? "inactive" : snapshot.overall.status,
  );

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="card overflow-hidden border-ink bg-ink text-white">
        <div className="grid lg:grid-cols-[1.5fr_1fr]">
          <div className="p-5 sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cx(
                  "h-2 w-2 rounded-full",
                  OVERALL_DOT[snapshot.overall.status] ?? "bg-slate-300",
                  critical > 0 && "status-pulse",
                )}
                aria-hidden="true"
              />
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
                {aiMode}
              </span>
              <span className="rounded-full border border-white/15 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-white/50">
                Simulated
              </span>
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              {snapshot.overall.label}
              <span className={cx("text-white/45", overallTone === "crit" && "text-rose-300")}>
                .
              </span>
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70">
              {snapshot.summary}
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-[11px] text-white/65">
              <span className="rounded-full bg-white/10 px-2.5 py-1.5">
                {active.length} active alert{active.length === 1 ? "" : "s"}
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-1.5">
                Last reading {formatRelative(snapshot.device.last_reading_at)}
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-1.5">
                Activity {activityLabel(snapshot.device.activity)}
              </span>
            </div>
          </div>

          <div className="border-t border-white/10 p-5 sm:p-7 lg:border-l lg:border-t-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">
              Device
            </p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-white/55">Wearable</span>
                <span className="flex items-center gap-2 font-semibold">
                  <span
                    className={cx(
                      "h-1.5 w-1.5 rounded-full",
                      snapshot.device.connected ? "bg-emerald-300" : "bg-rose-300",
                    )}
                  />
                  {snapshot.device.connected ? "Connected" : "No signal"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-white/55">Scenario</span>
                <span className="text-right font-medium text-white/90">
                  {snapshot.device.scenario_label}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-white/55">Sampling</span>
                <span className="numeric text-white/90">
                  {snapshot.device.tick_seconds.toFixed(1)}s
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-white/55">Last update</span>
                <span className="numeric text-white/90">
                  {formatClock(snapshot.device.last_reading_at)}
                </span>
              </div>
            </div>
            <p className="mt-6 text-[10px] leading-relaxed text-white/35">
              Demo telemetry only. Not a medical device.
            </p>
          </div>
        </div>
      </section>

      <div className="flex items-end justify-between gap-3 px-1">
        <div>
          <p className="eyebrow">Live vitals</p>
          <h2 className="section-title mt-1">Wearable snapshot</h2>
        </div>
        <StatusPill
          status={snapshot.overall.status === "paused" ? "inactive" : snapshot.overall.status}
          label={snapshot.overall.status === "paused" ? "Paused" : snapshot.overall.label}
          pulse={critical > 0}
        />
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Vital signs">
        {snapshot.vitals.map((vital) => (
          <VitalCard key={vital.key} vital={vital} />
        ))}
      </section>

      <DemoControls
        device={snapshot.device}
        busy={busy}
        onStart={onStart}
        onStop={onStop}
        onScenario={onScenario}
        onDisconnect={onDisconnect}
        onReconnect={onReconnect}
      />

      <section>
        <div className="mb-3 flex items-end justify-between gap-3 px-1">
          <div>
            <p className="eyebrow">Attention</p>
            <h2 className="section-title mt-1">Recent alerts</h2>
          </div>
          <button type="button" className="btn btn-quiet" onClick={onOpenAlerts}>
            All alerts
          </button>
        </div>
        {recent.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {recent.map((alert) => (
              <AlertCard key={alert.id} alert={alert} compact />
            ))}
          </div>
        ) : (
          <div className="card p-5 text-sm text-muted">
            No alerts recorded. Live readings are shown above.
          </div>
        )}
      </section>

    </div>
  );
}
