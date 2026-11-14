"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, Menu, Radio } from "lucide-react";
import { navItemFor } from "@/components/layout/nav";
import { useCrew } from "@/components/providers/CrewProvider";
import { getAlertCount } from "@/lib/data/vitals";
import { MISSION } from "@/lib/data/mission";
import { formatClockSeconds } from "@/lib/health/format";
import { cn } from "@/lib/utils/cn";

/** Mission clock that advances from the dataset's newest reading. */
export function MissionClock({ className }: { className?: string }) {
  const [now, setNow] = useState(MISSION.now);

  useEffect(() => {
    const started = Date.now();
    const id = window.setInterval(() => {
      setNow(MISSION.now + Math.floor((Date.now() - started) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className={cn("flex items-baseline gap-1.5", className)} title="Mission time (UTC), advancing from the dataset snapshot">
      <span className="num text-[12px] text-ink/90">{formatClockSeconds(now)}</span>
      <span className="font-mono text-[8.5px] tracking-[0.14em] text-dim">UTC</span>
    </div>
  );
}

function CrewSelect() {
  const { subjectId, setSubjectId, crew } = useCrew();
  const active = crew.find((c) => c.id === subjectId) ?? crew[0];

  return (
    <label className="group relative flex items-center gap-2 rounded-md border border-line bg-deep/60 pl-2.5 pr-1.5 transition-colors hover:border-edge">
      <span className="hidden font-mono text-[8.5px] uppercase tracking-[0.14em] text-dim sm:block">
        Crew
      </span>
      <select
        value={subjectId}
        onChange={(event) => setSubjectId(event.target.value)}
        aria-label="Active crew member"
        className="h-8 max-w-[142px] appearance-none truncate bg-transparent pr-4 font-mono text-[10.5px] text-ink focus:outline-none"
      >
        {crew.map((member) => (
          <option key={member.id} value={member.id} className="bg-void text-ink">
            {member.name} · {member.id}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-1.5 size-3 text-dim" />
      <span className="sr-only">{active.role}</span>
    </label>
  );
}

export function TopBar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const active = navItemFor(pathname);
  const { subjectId } = useCrew();
  const alerts = getAlertCount(subjectId);

  return (
    <header className="sticky top-0 z-20 border-b border-line/70 bg-void/80 backdrop-blur-md">
      <div className="flex h-12 items-center gap-3 px-3 sm:px-5">
        <button
          type="button"
          onClick={onMenu}
          aria-label="Open navigation"
          className="rounded-md border border-line p-1.5 text-mute transition-colors hover:border-edge hover:text-ink lg:hidden"
        >
          <Menu className="size-4" />
        </button>

        <div className="flex min-w-0 items-center gap-2.5">
          <span className="font-mono text-[9px] tracking-[0.14em] text-dim">{active.index}</span>
          <span className="hidden h-3 w-px bg-line sm:block" />
          <span className="truncate text-[12px] font-medium tracking-[0.04em] text-ink">
            {active.label}
          </span>
          <span className="hidden truncate text-[10.5px] text-dim xl:block">/ {active.description}</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-md border border-aurora/25 bg-aurora/6 px-2 py-1 sm:flex">
            <span className="size-1.5 animate-pulse-dot rounded-full bg-aurora" />
            <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-aurora/90">Live</span>
          </span>

          <MissionClock className="hidden md:flex" />

          <Link
            href="/biometrics#alerts"
            className="relative flex items-center gap-1.5 rounded-md border border-line bg-deep/60 px-2 py-1.5 text-mute transition-colors hover:border-edge hover:text-ink"
            aria-label={`${alerts} alerts`}
            title={`${alerts} recorded alerts`}
          >
            <Bell className="size-3.5" />
            <span className="num text-[10px] text-ink/90">{alerts}</span>
            {alerts > 0 && (
              <span className="absolute -right-1 -top-1 size-1.5 rounded-full bg-orange shadow-[0_0_8px_2px_rgba(242,140,40,0.5)]" />
            )}
          </Link>

          <CrewSelect />

          <span className="hidden items-center gap-1 rounded-md border border-signal/25 bg-signal/6 px-1.5 py-1 font-mono text-[8.5px] tracking-[0.14em] text-signal/90 xl:flex">
            <Radio className="size-3" />
            LINK {MISSION.lightDelaySeconds}s
          </span>
        </div>
      </div>
    </header>
  );
}
