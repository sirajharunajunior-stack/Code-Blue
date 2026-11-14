"use client";

import { Orbit, Radiation, Satellite, Users, Wind } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Hazard, HazardId } from "@/types";

const ICONS: Record<HazardId, React.ElementType> = {
  radiation: Radiation,
  isolation: Users,
  distance: Satellite,
  gravity: Orbit,
  hostile: Wind,
};

/** Selectable card for one of the five human-spaceflight hazards. */
export function HazardCard({
  hazard,
  active,
  onSelect,
}: {
  hazard: Hazard;
  active: boolean;
  onSelect: () => void;
}) {
  const Icon = ICONS[hazard.id];

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "panel group relative overflow-hidden p-3 text-left transition-colors",
        active ? "border-signal/50 bg-signal/4" : "hover:border-edge/90",
      )}
    >
      <span
        className={cn(
          "absolute inset-x-0 top-0 h-px transition-opacity",
          active ? "opacity-100" : "opacity-40",
        )}
        style={{
          background: active
            ? "linear-gradient(90deg, transparent, #4ff0e4, transparent)"
            : "linear-gradient(90deg, transparent, #1b3f55, transparent)",
        }}
      />

      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "grid size-7 place-items-center rounded-md border transition-colors",
            active ? "border-signal/45 bg-signal/10 text-signal" : "border-line bg-deep/60 text-mute",
          )}
        >
          <Icon className="size-3.5" />
        </span>
        <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-dim">
          {String(hazard.countermeasures.length).padStart(2, "0")} CM
        </span>
      </div>

      <h3 className="mt-2 text-[11.5px] font-medium leading-snug text-ink group-hover:text-signal">
        {hazard.name}
      </h3>
      <p className="mt-0.5 line-clamp-2 text-[9.5px] leading-snug text-dim">{hazard.tagline}</p>

      <div className="mt-2 flex items-baseline justify-between gap-2 border-t border-line/60 pt-1.5">
        <span className="truncate font-mono text-[8.5px] uppercase tracking-[0.08em] text-dim">
          {hazard.exposure.label}
        </span>
        <span className="num shrink-0 text-[10.5px] text-ink/90">{hazard.exposure.value}</span>
      </div>
    </button>
  );
}
