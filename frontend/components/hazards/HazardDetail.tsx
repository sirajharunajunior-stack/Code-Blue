"use client";

import { useRouter } from "next/navigation";
import { ArrowUpRight, Check, Info, ShieldCheck } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Disclosure } from "@/components/ui/Disclosure";
import { LevelDot } from "@/components/ui/Badge";
import { BODY_SYSTEM_MAP } from "@/lib/data";
import { writeSession } from "@/lib/utils/session";
import { cn } from "@/lib/utils/cn";
import type { BodySystemId, Hazard, HealthLevel } from "@/types";

const CADENCE_STYLE: Record<string, string> = {
  immediate: "border-danger/40 bg-danger/8 text-danger",
  daily: "border-signal/35 bg-signal/8 text-signal",
  weekly: "border-violet/35 bg-violet/8 text-violet",
  mission: "border-line bg-deep/60 text-mute",
};

function CadenceBadge({ cadence }: { cadence: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-1.5 py-px font-mono text-[8px] uppercase tracking-[0.12em]",
        CADENCE_STYLE[cadence] ?? CADENCE_STYLE.mission,
      )}
    >
      {cadence}
    </span>
  );
}

export function HazardDetail({
  hazard,
  systemLevels,
}: {
  hazard: Hazard;
  systemLevels: Record<BodySystemId, HealthLevel>;
}) {
  const router = useRouter();

  const openSystem = (id: BodySystemId) => {
    writeSession("astra:focus-system", id);
    router.push("/digital-human");
  };

  return (
    <Panel
      title={hazard.name}
      description={hazard.tagline}
      corners
      flush
      action={<span className="chip border-line/60 text-dim">{hazard.countermeasures.length} steps</span>}
    >
      <div className="scroll-thin max-h-[640px] space-y-3.5 overflow-y-auto p-3.5">
        <div>
          <div className="label-tech mb-1">What it is</div>
          <p className="text-[11.5px] leading-relaxed text-ink/85">{hazard.what}</p>
        </div>

        <div>
          <div className="label-tech mb-1.5">How it affects the body</div>
          <ul className="space-y-1">
            {hazard.howItAffects.map((effect) => (
              <li key={effect} className="flex gap-1.5 text-[10.5px] leading-relaxed text-mute">
                <span className="mt-[6px] size-1 shrink-0 rounded-full bg-signal/60" />
                {effect}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="label-tech mb-1.5">Body areas</div>
          <div className="flex flex-wrap gap-1">
            {hazard.affectedSystems.map((id) => {
              const system = BODY_SYSTEM_MAP[id];
              const level = systemLevels[id];
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => openSystem(id)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-deep/50 px-2 py-1 text-[9.5px] text-mute transition-colors hover:border-signal/40 hover:text-ink"
                >
                  <LevelDot level={level} />
                  {system.shortLabel}
                  <ArrowUpRight className="size-2.5 text-dim" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <div className="rounded-md border border-line/70 bg-deep/40 p-2.5">
            <div className="label-tech mb-1.5">Risks</div>
            <ul className="space-y-1">
              {hazard.consequences.map((item) => (
                <li key={item} className="flex gap-1.5 text-[10px] leading-snug text-mute">
                  <span className="mt-[5px] size-1 shrink-0 rounded-full bg-orange/70" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-md border border-aurora/20 bg-aurora/4 p-2.5">
            <div className="label-tech mb-1.5 text-aurora/80">Prevention</div>
            <ul className="space-y-1">
              {hazard.prevention.map((item) => (
                <li key={item} className="flex gap-1.5 text-[10px] leading-snug text-mute">
                  <Check className="mt-px size-2.5 shrink-0 text-aurora/80" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <div className="label-tech flex items-center gap-1">
              <ShieldCheck className="size-2.5" /> Protective steps
            </div>
            <span className="font-mono text-[8.5px] text-dim">tap to open</span>
          </div>
          <div className="space-y-1">
            {hazard.countermeasures.map((countermeasure) => (
              <Disclosure
                key={countermeasure.title}
                title={countermeasure.title}
                meta={<CadenceBadge cadence={countermeasure.cadence} />}
              >
                <p>{countermeasure.detail}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {countermeasure.systemIds.map((id) => (
                    <span key={id} className="chip border-line/60 text-dim">
                      {BODY_SYSTEM_MAP[id].shortLabel}
                    </span>
                  ))}
                </div>
              </Disclosure>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-1.5 border-t border-line/60 pt-2 text-[9px] leading-snug text-dim">
          <Info className="mt-px size-3 shrink-0" />
          <span>General guidance for this demonstration. Follow mission rules and the flight surgeon.</span>
        </div>
      </div>
    </Panel>
  );
}
