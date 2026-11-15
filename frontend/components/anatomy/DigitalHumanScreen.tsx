"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Info } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Chip, LevelDot } from "@/components/ui/Badge";
import { BodySchematic } from "@/components/anatomy/BodySchematic";
import { SystemPanel } from "@/components/anatomy/SystemPanel";
import { SystemCards } from "@/components/anatomy/SystemCards";
import { useCrew } from "@/components/providers/CrewProvider";
import {
  BODY_SYSTEMS,
  BODY_SYSTEM_MAP,
  DEFAULT_SYSTEM_ID,
  getLatestMetric,
} from "@/lib/data";
import { LEVELS, worstLevel } from "@/lib/health/levels";
import { takeSession } from "@/lib/utils/session";
import { cn } from "@/lib/utils/cn";
import type { BodySystemId, HealthLevel } from "@/types";

export function DigitalHumanScreen() {
  const { subjectId, subject } = useCrew();
  const [activeId, setActiveId] = useState<BodySystemId>(DEFAULT_SYSTEM_ID);
  const pendingFocus = useRef<string | null | undefined>(undefined);

  /* A hazard panel can hand over a body system to focus. */
  useEffect(() => {
    if (pendingFocus.current === undefined) {
      pendingFocus.current = takeSession("astra:focus-system");
    }
    const focus = pendingFocus.current;
    if (!focus) return;
    if (!BODY_SYSTEMS.some((s) => s.id === focus)) return;
    /* Defer the update by one task so the effect does not cascade a render. */
    const timer = window.setTimeout(() => setActiveId(focus as BodySystemId), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const levels = useMemo(() => {
    return BODY_SYSTEMS.reduce(
      (acc, system) => {
        const readings = system.metricIds
          .map((id) => getLatestMetric(subjectId, id))
          .filter((r): r is NonNullable<typeof r> => Boolean(r));
        acc[system.id] = readings.length
          ? worstLevel(readings.map((r) => r.level))
          : ("normal" as HealthLevel);
        return acc;
      },
      {} as Record<BodySystemId, HealthLevel>,
    );
  }, [subjectId]);

  const fallbackActiveId = BODY_SYSTEM_MAP[activeId] ? activeId : DEFAULT_SYSTEM_ID;
  const active = BODY_SYSTEM_MAP[fallbackActiveId] ?? BODY_SYSTEM_MAP[DEFAULT_SYSTEM_ID];
  const flaggedSystems = Object.values(levels).filter((level) => level !== "normal").length;

  return (
    <div className="space-y-3">
      <PageHeader
        index="03"
        section="Body map"
        title="How each body system is doing"
        description="Pick a part of the body to see its readings and what to watch for."
        meta={
          <>
            <Chip tone="accent">{subject.name}</Chip>
            <Chip tone={flaggedSystems ? "default" : "muted"}>
              {flaggedSystems ? `${flaggedSystems} areas need attention` : "All areas normal"}
            </Chip>
          </>
        }
      />

      <div className="grid gap-2.5 xl:grid-cols-12">
        <div className="xl:col-span-2">
          <Panel title="Body areas" flush>
            <ul className="scroll-thin flex gap-1 overflow-x-auto p-1.5 xl:max-h-[560px] xl:flex-col xl:overflow-y-auto">
              {BODY_SYSTEMS.map((system) => {
                const isActive = system.id === fallbackActiveId;
                const level = levels[system.id];
                return (
                  <li key={system.id} className="shrink-0 xl:shrink">
                    <button
                      type="button"
                      onClick={() => {
                        if (BODY_SYSTEM_MAP[system.id]) {
                          setActiveId(system.id);
                        }
                      }}
                      aria-pressed={isActive}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left transition-colors",
                        isActive
                          ? "border-signal/45 bg-signal/6 text-ink"
                          : "border-transparent text-mute hover:bg-panel-2/70 hover:text-ink",
                      )}
                    >
                      <LevelDot level={level} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[10.5px]">{system.shortLabel}</span>
                        <span className="hidden truncate text-[8.5px] text-dim xl:block">
                          {LEVELS[level].label}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>

        <div className="xl:col-span-5">
          <Panel
            title="Body map"
            corners
            flush
            action={<span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-dim">Breathing · select a system</span>}
          >
            <div className="relative">
              <div className="mx-auto h-[420px] w-full max-w-[320px] px-2 py-2 sm:h-[480px]">
                <BodySchematic active={fallbackActiveId} onSelect={setActiveId} levels={levels} />
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 border-t border-line/60 px-3 py-2">
                {(["normal", "slightly_abnormal", "needs_checkup", "critical"] as HealthLevel[]).map((level) => (
                  <span key={level} className="inline-flex items-center gap-1 font-mono text-[8.5px] text-dim">
                    <span className={cn("size-1.5 rounded-full", LEVELS[level].dot)} />
                    {LEVELS[level].label}
                  </span>
                ))}
              </div>
              <p className="border-t border-line/60 px-3 py-2 text-center text-[9px] leading-relaxed text-dim">
                Figure by{" "}
                <a
                  href="https://commons.wikimedia.org/wiki/File:Female-male_front-back_3d-shaded_human_illustration.svg"
                  target="_blank"
                  rel="noreferrer"
                  className="text-mute underline decoration-line underline-offset-2 hover:text-signal"
                >
                  Goran tek-en
                </a>
                , based on work by Mikael Häggström with anatomical input from Rob Hurt ·{" "}
                <a
                  href="https://creativecommons.org/licenses/by-sa/4.0/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-mute underline decoration-line underline-offset-2 hover:text-signal"
                >
                  CC BY-SA 4.0
                </a>
                . Front-view crop and interactive educational overlays.
              </p>
            </div>
          </Panel>
        </div>

        <div className="xl:col-span-5">
          <SystemPanel system={active} subjectId={subjectId} />
        </div>
      </div>

      <SystemCards system={active} subjectId={subjectId} />

      <div className="panel flex items-start gap-2 px-3 py-2.5">
        <Info className="mt-px size-3.5 shrink-0 text-signal/70" />
        <p className="text-[10px] leading-relaxed text-mute">
          An anatomical illustration, not medical imaging or a diagnostic scan. Ask the flight surgeon before making any medical decision.
        </p>
      </div>
    </div>
  );
}
