import type { Scenario, Snapshot } from "../types";
import { cx } from "../lib/format";

const SCENARIOS: { value: Scenario; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "elevated_heart_rate", label: "High HR" },
  { value: "low_spo2", label: "Low O₂" },
  { value: "high_temperature", label: "High temp" },
  { value: "abnormal_respiration", label: "High RR" },
  { value: "recovery", label: "Recovery" },
];

interface DemoControlsProps {
  device: Snapshot["device"];
  busy: string | null;
  onStart: () => void;
  onStop: () => void;
  onScenario: (scenario: Scenario) => void;
  onDisconnect: () => void;
  onReconnect: () => void;
}

export function DemoControls({
  device,
  busy,
  onStart,
  onStop,
  onScenario,
  onDisconnect,
  onReconnect,
}: DemoControlsProps) {
  const disabled = busy !== null;

  return (
    <section className="card p-4 sm:p-5" aria-label="Demo controls">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Demo controls</p>
          <p className="mt-1 text-sm text-muted">
            Drive the simulated wearable through normal and abnormal states.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={cx("btn", device.monitoring ? "btn-quiet" : "btn-primary")}
            onClick={device.monitoring ? onStop : onStart}
            disabled={disabled}
          >
            {busy === "start"
              ? "Starting…"
              : busy === "stop"
                ? "Pausing…"
                : device.monitoring
                  ? "Pause"
                  : "Start"}
          </button>
          {device.connected ? (
            <button
              type="button"
              className="btn btn-danger"
              onClick={onDisconnect}
              disabled={disabled}
            >
              {busy === "disconnect" ? "Disconnecting…" : "Disconnect"}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-soft"
              onClick={onReconnect}
              disabled={disabled}
            >
              {busy === "reconnect" ? "Reconnecting…" : "Reconnect"}
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {SCENARIOS.map((item) => {
          const active =
            device.scenario === item.value ||
            (item.value === "normal" && device.scenario === "normal");
          return (
            <button
              key={item.value}
              type="button"
              className={cx(
                "btn justify-between px-3",
                active ? "btn-soft ring-1 ring-brand/20" : "btn-quiet",
              )}
              onClick={() => onScenario(item.value)}
              disabled={disabled}
              aria-pressed={active}
            >
              <span>{item.label}</span>
              {active && (
                <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] text-muted">
        Recovery gradually returns readings to normal. All values are simulated.
      </p>
    </section>
  );
}
