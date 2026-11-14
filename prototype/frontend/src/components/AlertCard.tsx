import { cx, formatDateTime, formatRelative, formatVitalValue } from "../lib/format";
import type { Alert } from "../types";
import { StatusPill } from "./StatusPill";

interface AlertCardProps {
  alert: Alert;
  compact?: boolean;
  busy?: boolean;
  onAcknowledge?: (alertId: number) => void;
}

const AI_LABELS = {
  pending: "AI pending",
  ready: "AI guidance",
  fallback: "Safety fallback",
};

function ListSection({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="eyebrow">{title}</p>
      <ul className="mt-1.5 space-y-1 text-[12px] leading-relaxed text-ink/85">
        {items.map((item, index) => (
          <li key={`${index}-${item}`} className="flex gap-2">
            <span className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-brand/60" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AlertCard({
  alert,
  compact = false,
  busy = false,
  onAcknowledge,
}: AlertCardProps) {
  const resolved = alert.status === "resolved";
  const statusLabel = resolved
    ? "Resolved"
    : alert.status === "acknowledged"
      ? "Acknowledged"
      : alert.severity === "critical"
        ? "Critical"
        : "Warning";
  const status = resolved
    ? "inactive"
    : alert.status === "acknowledged"
      ? "brand"
      : alert.severity;

  return (
    <article
      className={cx(
        "card animate-fade-up p-4 sm:p-5",
        !resolved && alert.severity === "critical" && "border-l-4 border-l-crit",
      )}
      aria-label={`${statusLabel}: ${alert.title}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill
            status={status}
            label={statusLabel}
            pulse={!resolved && alert.severity === "critical"}
          />
          <span className="chip">{AI_LABELS[alert.ai_status]}</span>
        </div>
        <span className="text-right text-[11px] leading-tight text-muted">
          <span className="block">{formatRelative(alert.detected_at)}</span>
          <span className="mt-0.5 block text-[10px]">
            {formatDateTime(alert.detected_at)}
          </span>
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-base font-bold tracking-tight text-ink">{alert.title}</h3>
          <p className="mt-1 text-[12px] text-muted">
            {alert.threshold}
            {alert.acknowledged_at && ` · acknowledged ${formatRelative(alert.acknowledged_at)}`}
          </p>
        </div>
        {alert.value !== null && (
          <p className="shrink-0 text-right">
            <span className="numeric text-2xl font-semibold text-ink">
              {formatVitalValue(alert.value)}
            </span>{" "}
            <span className="text-xs text-muted">{alert.unit}</span>
            <span className="mt-0.5 block text-[9px] uppercase tracking-[0.12em] text-muted">
              Latest abnormal
            </span>
          </p>
        )}
      </div>

      {!compact && (
        <p className="mt-3 text-[13px] leading-relaxed text-ink/80">
          {alert.recommendation}
        </p>
      )}

      {!compact && (
        <details className="group mt-3 border-t border-line pt-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-xs font-semibold text-brand">
            <span>View monitoring guidance</span>
            <span className="text-base font-normal text-muted transition group-open:rotate-45">
              +
            </span>
          </summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <p className="eyebrow">Detected</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-ink/85">
                {alert.explanation.detected}
              </p>
            </div>
            <ListSection
              title="Triggering readings at detection"
              items={alert.explanation.readings}
            />
            <div>
              <p className="eyebrow">What it means</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-ink/85">
                {alert.explanation.meaning}
              </p>
            </div>
            <ListSection title="Possible factors" items={alert.explanation.factors} />
            <ListSection
              title="Immediate actions"
              items={alert.explanation.immediate_actions}
            />
            <div>
              <p className="eyebrow">Escalation</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-ink/85">
                {alert.explanation.escalation}
              </p>
            </div>
            <div>
              <p className="eyebrow">Follow-up</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-ink/85">
                {alert.explanation.follow_up}
              </p>
            </div>
          </div>
        </details>
      )}

      {!compact && !resolved && onAcknowledge && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            className={cx(
              "btn",
              alert.status === "acknowledged" ? "btn-quiet" : "btn-primary",
            )}
            onClick={() => onAcknowledge(alert.id)}
            disabled={busy || alert.status === "acknowledged"}
          >
            {busy
              ? "Acknowledging…"
              : alert.status === "acknowledged"
                ? "Acknowledged"
                : "Acknowledge alert"}
          </button>
        </div>
      )}
    </article>
  );
}
