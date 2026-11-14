import { useState } from "react";

import { AlertCard } from "../components/AlertCard";
import { StatusPill } from "../components/StatusPill";
import { cx } from "../lib/format";
import type { Snapshot } from "../types";

export function Alerts({
  snapshot,
  busy,
  onAcknowledge,
}: {
  snapshot: Snapshot;
  busy: string | null;
  onAcknowledge: (alertId: number) => void;
}) {
  const [filter, setFilter] = useState<"active" | "all">("active");
  const activeAlerts = [...snapshot.active_alerts].sort((a, b) => {
    const rank = { critical: 0, warning: 1 } as const;
    return rank[a.severity] - rank[b.severity];
  });
  const visible = filter === "active" ? activeAlerts : snapshot.alerts;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <p className="eyebrow">Alerts</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Monitoring alerts
          </h1>
          <p className="mt-1 text-sm text-muted">
            Active alerts stay open until two consecutive normal readings resolve them.
          </p>
        </div>
        <StatusPill
          status={
            activeAlerts.some((alert) => alert.severity === "critical")
              ? "critical"
              : activeAlerts.length
                ? "warning"
                : "normal"
          }
          label={`${activeAlerts.length} active`}
          pulse={activeAlerts.some((alert) => alert.severity === "critical")}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={cx("btn", filter === "active" ? "btn-primary" : "btn-quiet")}
          onClick={() => setFilter("active")}
        >
          Active ({activeAlerts.length})
        </button>
        <button
          type="button"
          className={cx("btn", filter === "all" ? "btn-primary" : "btn-quiet")}
          onClick={() => setFilter("all")}
        >
          All recent ({snapshot.alerts.length})
        </button>
      </div>

      {visible.length ? (
        <div className="space-y-3">
          {visible.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              busy={busy === `ack-${alert.id}`}
              onAcknowledge={onAcknowledge}
            />
          ))}
        </div>
      ) : (
        <div className="card p-8 text-center">
          <p className="text-sm font-semibold text-ink">
            {filter === "active" ? "No active alerts" : "No alerts yet"}
          </p>
          <p className="mt-1 text-xs text-muted">
            {filter === "active"
              ? "Current readings are within expected ranges."
              : "Abnormal readings will appear here with guidance and escalation steps."}
          </p>
        </div>
      )}
    </div>
  );
}
