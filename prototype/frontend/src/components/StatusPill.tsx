import { cx } from "../lib/format";

type Tone = "good" | "warn" | "crit" | "dim" | "brand";

const toneClasses: Record<Tone, string> = {
  good: "border-good/15 bg-good-soft text-good",
  warn: "border-warn/15 bg-warn-soft text-warn",
  crit: "border-crit/15 bg-crit-soft text-crit",
  dim: "border-line bg-dim-soft text-dim",
  brand: "border-brand/15 bg-brand-soft text-brand",
};

export function toneForStatus(status: string): Tone {
  if (status === "normal") return "good";
  if (status === "warning") return "warn";
  if (status === "critical") return "crit";
  if (status === "sensor_error") return "warn";
  if (status === "no_signal" || status === "inactive" || status === "no_data") {
    return "dim";
  }
  return "brand";
}

interface StatusPillProps {
  status: string;
  label?: string;
  className?: string;
  pulse?: boolean;
}

export function StatusPill({
  status,
  label,
  className,
  pulse = false,
}: StatusPillProps) {
  const tone = toneForStatus(status);
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]",
        toneClasses[tone],
        className,
      )}
    >
      <span
        className={cx("status-dot", pulse && status === "critical" && "status-pulse")}
        aria-hidden="true"
      />
      {label ?? status.replace("_", " ")}
    </span>
  );
}
