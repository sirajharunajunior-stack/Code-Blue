"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Check, Satellite, ShieldAlert } from "lucide-react";
import { NAV_ITEMS, navItemFor } from "@/components/layout/nav";
import { useCrew } from "@/components/providers/CrewProvider";
import { LEVELS } from "@/lib/health/levels";
import { getOverallLevel } from "@/lib/data/vitals";
import { getCrew } from "@/lib/data/subjects";
import { MISSION, MISSION_DAY } from "@/lib/data/mission";
import { formatMissionElapsed } from "@/lib/health/format";
import { cn } from "@/lib/utils/cn";
import { DemoTag } from "@/components/ui/Badge";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative grid size-9 place-items-center", className)}>
      <svg viewBox="0 0 40 40" className="absolute inset-0 size-full" aria-hidden>
        <circle cx="20" cy="20" r="18.5" fill="none" stroke="#1b3f55" strokeWidth="0.8" />
        <ellipse
          cx="20"
          cy="20"
          rx="17"
          ry="7"
          fill="none"
          stroke="#4ff0e4"
          strokeWidth="0.8"
          opacity="0.55"
          transform="rotate(-24 20 20)"
        />
        <circle cx="20" cy="20" r="4.5" fill="#4ff0e4" opacity="0.18" />
        <circle cx="20" cy="20" r="1.6" fill="#4ff0e4" />
        <circle cx="33.4" cy="13.8" r="1.4" fill="#8b9cff" />
      </svg>
    </span>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = navItemFor(pathname);
  const { subjectId, setSubjectId } = useCrew();
  const crew = getCrew();

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-panel/80 to-void/95">
      {/* identity */}
      <div className="flex items-center gap-2.5 border-b border-line/70 px-4 py-4">
        <BrandMark />
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[15px] font-semibold tracking-[0.22em] text-ink">ASTRA</span>
            <span className="font-mono text-[8px] tracking-[0.16em] text-signal/80">v1.0</span>
          </div>
          <p className="label-tech mt-0.5 text-[8.5px]">Astronaut health platform</p>
        </div>
      </div>

      {/* nav */}
      <nav className="scroll-thin flex-1 overflow-y-auto px-2 py-3" aria-label="Sections">
        <div className="label-tech px-2 pb-2">Sections</div>
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === active.href;
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center gap-2.5 rounded-md px-2 py-2 transition-colors",
                    isActive
                      ? "bg-signal/8 text-ink"
                      : "text-mute hover:bg-panel-2/70 hover:text-ink",
                  )}
                >
                  <span
                    className={cn(
                      "absolute left-0 top-1.5 h-[calc(100%-12px)] w-px transition-colors",
                      isActive ? "bg-signal" : "bg-transparent",
                    )}
                  />
                  <Icon
                    className={cn(
                      "size-3.5 shrink-0 transition-colors",
                      isActive ? "text-signal" : "text-dim group-hover:text-mute",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-medium tracking-[0.01em]">
                      {item.label}
                    </span>
                    <span className="block truncate text-[9.5px] leading-tight text-dim">
                      {item.description}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "font-mono text-[8px] tracking-[0.1em]",
                      isActive ? "text-signal/70" : "text-dim/60",
                    )}
                  >
                    {item.index}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* crew */}
        <div className="label-tech mt-5 px-2 pb-2">Crew · select</div>
        <ul className="space-y-0.5">
          {crew.map((member) => {
            const level = getOverallLevel(member.id);
            const meta = LEVELS[level];
            const isActive = member.id === subjectId;
            return (
              <li key={member.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSubjectId(member.id);
                    onNavigate?.();
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
                    isActive ? "bg-panel-2 text-ink" : "text-mute hover:bg-panel-2/60 hover:text-ink",
                  )}
                >
                  <span className={cn("size-1.5 shrink-0 rounded-full", meta.dot)} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px]">{member.name}</span>
                    <span className="block truncate text-[9px] text-dim">{member.role}</span>
                  </span>
                  {isActive && <Check className="size-3 text-signal" />}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* mission + disclaimer */}
      <div className="space-y-2.5 border-t border-line/70 px-3 py-3">
        <div className="rounded-md border border-line/70 bg-deep/50 p-2.5">
          <div className="flex items-center justify-between">
            <span className="label-tech">Mission</span>
            <Satellite className="size-3 text-dim" />
          </div>
          <p className="mt-1 text-[11.5px] font-medium tracking-[0.06em] text-ink">{MISSION.name}</p>
          <dl className="mt-1.5 space-y-0.5 font-mono text-[9px] text-mute">
            <div className="flex justify-between gap-2">
              <dt className="text-dim">MET</dt>
              <dd className="num">{formatMissionElapsed(MISSION.now - MISSION.launch)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-dim">FD</dt>
              <dd className="num">{MISSION_DAY}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-dim">SOLAR</dt>
              <dd className="uppercase text-amber">{MISSION.solarActivity}</dd>
            </div>
          </dl>
        </div>

        <div className="flex items-start gap-1.5 rounded-md border border-violet/25 bg-violet/6 px-2 py-1.5">
          <ShieldAlert className="mt-px size-3 shrink-0 text-violet" />
          <p className="text-[9px] leading-snug text-mute">
            <DemoTag className="mr-1 align-middle" />
            Demonstration data. Informational only — not a medical device.
          </p>
        </div>

        <div className="flex items-center justify-between px-0.5 font-mono text-[8.5px] text-dim">
          <span>Snapshot · demonstration data</span>
          <Link href="/hazards" className="inline-flex items-center gap-0.5 hover:text-signal">
            Hazards <ArrowUpRight className="size-2.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
