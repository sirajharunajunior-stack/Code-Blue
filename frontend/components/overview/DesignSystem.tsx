"use client";

import { useMemo, useState } from "react";
import { Check, Copy, MousePointerClick, Palette as PaletteIcon } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Segmented } from "@/components/ui/Segmented";
import { DemoTag, LevelBadge, SourceTag } from "@/components/ui/Badge";
import { FieldShell, ToggleField, inputClass } from "@/components/ui/Field";
import { Meter } from "@/components/ui/Meter";
import { Sparkline } from "@/components/ui/Sparkline";
import { useToast } from "@/components/ui/Toast";
import { useCrew } from "@/components/providers/CrewProvider";
import { classifyValue, getLatestFor, getReadingsInWindow } from "@/lib/data/vitals";
import { getMetric } from "@/lib/data/metrics";
import { formatMetricValue } from "@/lib/health/format";
import { LEVELS } from "@/lib/health/levels";
import type { HealthLevel, MeasurementSource } from "@/types";
import { cn } from "@/lib/utils/cn";

const TOKENS = [
  { name: "Void", token: "--color-void", hex: "#03060a" },
  { name: "Deep", token: "--color-deep", hex: "#050c14" },
  { name: "Panel", token: "--color-panel", hex: "#081420" },
  { name: "Panel 2", token: "--color-panel-2", hex: "#0b1b28" },
  { name: "Line", token: "--color-line", hex: "#12283a" },
  { name: "Edge", token: "--color-edge", hex: "#1b3f55" },
  { name: "Ink", token: "--color-ink", hex: "#e6f4fa" },
  { name: "Mute", token: "--color-mute", hex: "#7b93a4" },
  { name: "Signal", token: "--color-signal", hex: "#4ff0e4" },
  { name: "Aurora", token: "--color-aurora", hex: "#35d07f" },
  { name: "Amber", token: "--color-amber", hex: "#f2c200" },
  { name: "Orange", token: "--color-orange", hex: "#f28c28" },
  { name: "Danger", token: "--color-danger", hex: "#ff4d5e" },
  { name: "Violet", token: "--color-violet", hex: "#8b9cff" },
];

const TYPE_SCALE = [
  { label: "Display", sample: "Crew health status", className: "text-[21px] font-semibold tracking-[-0.01em]", meta: "21 / 600" },
  { label: "Heading", sample: "Threshold alerts", className: "text-[13px] font-medium", meta: "13 / 500" },
  { label: "Body", sample: "Every indicator with its configured range.", className: "text-[11.5px] text-mute", meta: "11.5 / 400" },
  { label: "Technical", sample: "VITALS / LIVE", className: "label-tech", meta: "10 / mono" },
  { label: "Numeric", sample: "61.5 bpm", className: "num text-[18px] text-ink", meta: "mono / tabular" },
];

const RANGES = [
  { value: 24, label: "24H" },
  { value: 72, label: "72H" },
  { value: 168, label: "7D" },
];

const SOURCES: MeasurementSource[] = ["sensor", "dataset", "manual", "self-report"];

export function DesignSystemSection() {
  const { push } = useToast();
  const { subjectId } = useCrew();
  const [range, setRange] = useState(24);
  const [manual, setManual] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [modal, setModal] = useState<null | "preview" | "escalation">(null);

  const heart = getLatestFor(subjectId, "heart_rate");
  const spark = useMemo(
    () =>
      getReadingsInWindow(subjectId, "heart_rate", 24)
        .slice(-26)
        .map((r) => r.value),
    [subjectId],
  );

  const manualNumber = manual.trim() === "" ? null : Number(manual);
  const manualLevel: HealthLevel | null =
    manualNumber !== null && Number.isFinite(manualNumber)
      ? classifyValue("heart_rate", manualNumber)
      : null;

  const copyToken = async (token: (typeof TOKENS)[number]) => {
    try {
      await navigator.clipboard.writeText(token.hex);
      push({ title: `${token.token} copied`, description: token.hex, tone: "success" });
    } catch {
      push({ title: token.token, description: token.hex, tone: "info" });
    }
  };

  return (
    <section aria-labelledby="design-system">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <span id="design-system" className="label-tech flex items-center gap-1">
            <PaletteIcon className="size-3 text-signal/70" /> Design system
          </span>
          <span className="h-2.5 w-px bg-line" />
          <span className="font-mono text-[8.5px] text-dim">
            tokens · type · controls · states — every screen consumes these
          </span>
        </div>
        <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-dim">
          Click a swatch to copy
        </span>
      </div>

      <div className="grid gap-2.5 xl:grid-cols-12">
        {/* palette */}
        <Panel className="xl:col-span-4" label="Foundations / colour" title="Palette tokens" flush>
          <div className="grid grid-cols-2 gap-1 p-2 sm:grid-cols-3 xl:grid-cols-2">
            {TOKENS.map((token) => (
              <button
                key={token.token}
                type="button"
                onClick={() => void copyToken(token)}
                title={`Copy ${token.hex}`}
                className="group flex items-center gap-1.5 rounded-md border border-line/60 bg-deep/40 p-1 text-left transition-colors hover:border-edge"
              >
                <span
                  className="size-5 shrink-0 rounded-[3px] border border-white/10"
                  style={{ background: token.hex }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[9.5px] text-ink/85">{token.name}</span>
                  <span className="block truncate font-mono text-[7.5px] uppercase text-dim">{token.hex}</span>
                </span>
                <Copy className="size-2.5 shrink-0 text-dim opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ))}
          </div>
          <p className="border-t border-line/50 px-2.5 py-1.5 font-mono text-[8px] leading-snug text-dim">
            Status colour is always paired with a label. Colour alone never carries meaning.
          </p>
        </Panel>

        {/* typography */}
        <Panel className="xl:col-span-3" label="Foundations / type" title="Type scale">
          <ul className="space-y-2">
            {TYPE_SCALE.map((row) => (
              <li key={row.label} className="flex items-baseline justify-between gap-2 border-b border-line/40 pb-1.5 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <div className="label-tech mb-0.5 text-[7.5px]">{row.label}</div>
                  <p className={cn("truncate", row.className)}>{row.sample}</p>
                </div>
                <span className="shrink-0 font-mono text-[8px] text-dim">{row.meta}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 grid grid-cols-3 gap-1 border-t border-line/50 pt-2">
            {[
              { label: "Radius", value: "10px" },
              { label: "Border", value: "1px" },
              { label: "Motion", value: "150ms" },
            ].map((item) => (
              <div key={item.label} className="rounded border border-line/60 bg-deep/40 px-1.5 py-1">
                <div className="label-tech text-[7.5px]">{item.label}</div>
                <div className="num mt-0.5 text-[10px] text-ink">{item.value}</div>
              </div>
            ))}
          </div>
        </Panel>

        {/* controls */}
        <Panel className="xl:col-span-5" label="Components / controls" title="Buttons, inputs & states" flush>
          <div className="space-y-2.5 p-2.5">
            <div>
              <div className="label-tech mb-1">Buttons</div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    push({
                      title: "Primary action",
                      description: "Primary buttons confirm a measurement or submission.",
                      tone: "success",
                    })
                  }
                >
                  Confirm
                </Button>
                <Button variant="outline" size="sm" href="/biometrics">
                  Open vitals
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setModal("preview")}>
                  Preview
                </Button>
                <Button variant="danger" size="sm" onClick={() => setModal("escalation")}>
                  Escalate
                </Button>
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={() => {
                    setManual("");
                    setRange(24);
                    setConfirmed(false);
                    push({ title: "Demo state reset", tone: "info" });
                  }}
                >
                  Reset
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <div className="label-tech mb-1">Segmented control</div>
                <Segmented options={RANGES} value={range} onChange={setRange} ariaLabel="Preview range" />
              </div>
              <span className="font-mono text-[8.5px] text-dim">
                window {range}H · {range === 168 ? "7 days" : `${range} hours`}
              </span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <FieldShell
                label="Manual entry preview"
                unit="bpm"
                htmlFor="preview-manual"
                hint="Classified against the configured heart-rate range."
              >
                <div className="flex items-center gap-1.5">
                  <input
                    id="preview-manual"
                    value={manual}
                    onChange={(event) => setManual(event.target.value.replace(/[^\d.]/g, ""))}
                    inputMode="decimal"
                    placeholder="e.g. 62"
                    className={inputClass}
                  />
                  {manualLevel && <LevelBadge level={manualLevel} size="xs" />}
                </div>
              </FieldShell>

              <div>
                <div className="label-tech mb-1">Toggle & confirmation</div>
                <ToggleField
                  checked={confirmed}
                  onChange={setConfirmed}
                  label={confirmed ? "Values confirmed by crew" : "Awaiting crew confirmation"}
                />
                <p className="mt-1 text-[8.5px] leading-snug text-dim">
                  Manual values stay editable until confirmed.
                </p>
              </div>
            </div>
          </div>
          <div className="border-t border-line/50 px-2.5 py-1.5">
            <p className="flex items-center gap-1.5 font-mono text-[8px] leading-snug text-dim">
              <MousePointerClick className="size-2.5" />
              Every control here is live. Buttons open real routes, modals and notifications.
            </p>
          </div>
        </Panel>

        {/* data display */}
        <Panel className="xl:col-span-5" label="Components / data" title="Status, range & provenance" flush>
          <div className="space-y-2.5 p-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {(["normal", "slightly_abnormal", "needs_checkup", "critical"] as HealthLevel[]).map((level) => (
                <span key={level} className="flex items-center gap-1">
                  <LevelBadge level={level} size="xs" />
                  <span className="font-mono text-[7.5px] text-dim">{LEVELS[level].label}</span>
                </span>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 border-t border-line/50 pt-2">
              {SOURCES.map((source) => (
                <SourceTag key={source} source={source} />
              ))}
              <DemoTag />
              <span className="font-mono text-[8px] text-dim">provenance tags</span>
            </div>

            <div className="rounded-md border border-line/60 bg-deep/40 p-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[10.5px] text-ink/90">Heart rate · range meter</span>
                <span className="flex items-center gap-1.5">
                  <span className="num text-[12px] text-ink">
                    {heart ? formatMetricValue(heart.metric, heart.value) : "—"}
                  </span>
                  {heart && <LevelBadge level={heart.level} size="xs" showDot={false} />}
                </span>
              </div>
              <div className="mt-1.5">
                <Meter
                  metric={heart?.metric ?? getMetric("heart_rate")}
                  value={heart?.value ?? null}
                  level={heart?.level ?? "normal"}
                />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-dim">24 h sparkline</span>
                <div className="w-28">
                  <Sparkline values={spark} color={heart ? LEVELS[heart.level].hex : "#4ff0e4"} height={18} />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 rounded-md border border-line/60 bg-deep/40 px-2 py-1.5">
              <span className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.08em] text-dim">
                <Check className="size-2.5 text-aurora" /> Confirmation state
              </span>
              <span className="font-mono text-[8.5px] text-mute">
                {confirmed ? "Ready to submit" : "Pending review"}
              </span>
            </div>
          </div>
        </Panel>
      </div>

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal === "escalation" ? "Escalation preview" : "Component preview"}
        label={modal === "escalation" ? "Safety / escalation" : "Design system / modal"}
        width="max-w-md"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button
              variant={modal === "escalation" ? "danger" : "primary"}
              size="sm"
              onClick={() => {
                push({
                  title: modal === "escalation" ? "Escalation acknowledged" : "Preview confirmed",
                  description:
                    modal === "escalation"
                      ? "This is a demonstration only — no message was sent to a flight surgeon."
                      : "Modal, panel and button styling follow the same tokens as every screen.",
                  tone: modal === "escalation" ? "warning" : "success",
                });
                setModal(null);
              }}
            >
              {modal === "escalation" ? "Acknowledge" : "Confirm"}
            </Button>
          </>
        }
      >
        {modal === "escalation" ? (
          <div className="space-y-2.5">
            <p className="text-[11.5px] leading-relaxed text-mute">
              Danger-styled actions are reserved for real escalation. In this build the control is a
              demonstration: nothing is transmitted, and no clinical action is taken.
            </p>
            <div className="rounded-md border border-danger/30 bg-danger/8 px-2.5 py-2 text-[10.5px] leading-relaxed text-ink/85">
              In a live deployment this dialog would open the emergency medical checklist and page the flight
              surgeon.
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            <p className="text-[11.5px] leading-relaxed text-mute">
              Drawers use the same panel surface, corner brackets and technical labels as inline panels, so
              the interface never changes visual language mid-task.
            </p>
            <ul className="space-y-1 font-mono text-[8.5px] uppercase tracking-[0.08em] text-dim">
              <li>· Escape closes · focus returns to the trigger</li>
              <li>· Body scroll locked while open</li>
              <li>· Mobile: bottom sheet · desktop: centred dialog</li>
            </ul>
          </div>
        )}
      </Modal>
    </section>
  );
}
