"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  Compass,
  Globe,
  Radio,
  Satellite,
  Sun,
  Thermometer,
} from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { DemoTag, LevelBadge } from "@/components/ui/Badge";
import { useCrew } from "@/components/providers/CrewProvider";
import { NAV_ITEMS } from "@/components/layout/nav";
import { useToast } from "@/components/ui/Toast";
import { BODY_SYSTEMS } from "@/lib/data/bodySystems";
import { ASSESSMENTS } from "@/lib/data/assessments";
import { HAZARDS } from "@/lib/data/hazards";
import { MISSION, MISSION_DAY } from "@/lib/data/mission";
import { getCrew } from "@/lib/data/subjects";
import { getLatestFor, getLatestMetric, getSubjectSummary, getFlagged } from "@/lib/data/vitals";
import {
  formatDistanceKm,
  formatLightDelay,
  formatMetricValue,
  formatMissionElapsed,
  formatNumber,
  formatRelative,
} from "@/lib/health/format";
import { LEVELS } from "@/lib/health/levels";
import { cn } from "@/lib/utils/cn";

const SOLAR_TONE = {
  quiet: { dot: "bg-aurora", text: "text-aurora" },
  elevated: { dot: "bg-amber", text: "text-amber" },
  storm: { dot: "bg-danger", text: "text-danger" },
} as const;

export function MissionStatusPanel() {
  const progress = Math.min(
    100,
    (MISSION.distanceFromEarthKm / MISSION.plannedDistanceKm) * 100,
  );
  const solar = SOLAR_TONE[MISSION.solarActivity];

  return (
    <Panel
      label="Mission / status"
      title={MISSION.name}
      corners
      action={
        <span className="inline-flex items-center gap-1.5 rounded-full border border-aurora/30 bg-aurora/6 px-2 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.12em] text-aurora">
          <span className="size-1.5 animate-pulse-dot rounded-full bg-aurora" />
          Transmitting
        </span>
      }
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className="text-[13px] text-ink/90">{MISSION.vehicle}</p>
        <span className="h-2.5 w-px bg-line" />
        <p className="text-[10.5px] text-mute">{MISSION.profile}</p>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {[
          {
            icon: Compass,
            label: "Mission elapsed",
            value: formatMissionElapsed(MISSION.now - MISSION.launch),
          },
          { icon: Satellite, label: "Flight day", value: String(MISSION_DAY) },
          {
            icon: Globe,
            label: "Destination",
            value: MISSION.destination.split(" — ")[0],
            hint: MISSION.destination,
          },
          { icon: Thermometer, label: "Range from Earth", value: formatDistanceKm(MISSION.distanceFromEarthKm) },
          { icon: Radio, label: "One-way light time", value: formatLightDelay(MISSION.lightDelaySeconds) },
          { icon: Sun, label: "Solar activity", value: MISSION.solarActivity, tone: solar.text },
        ].map(({ icon: Icon, label, value, hint, tone }) => (
          <div key={label} className="rounded-md border border-line/70 bg-deep/40 px-2 py-1.5" title={hint}>
            <dt className="label-tech flex items-center gap-1 text-[8px]">
              <Icon className="size-2.5" />
              {label}
            </dt>
            <dd className={cn("num mt-1 truncate text-[12px] capitalize text-ink", tone)}>{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-3">
        <div className="flex items-center justify-between font-mono text-[8.5px] uppercase tracking-[0.1em] text-dim">
          <span>Earth</span>
          <span className="text-signal/80">{formatNumber(progress, 1)}% transit complete</span>
          <span>Mars</span>
        </div>
        <div className="relative mt-1.5 h-1.5 overflow-hidden rounded-full bg-deep/80">
          <div className="absolute inset-y-0 left-0 w-full bg-signal/8" />
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-signal-dim to-signal/80"
            style={{ width: `${progress}%` }}
          />
          <div className="absolute inset-y-0 w-px bg-ink/70" style={{ left: `${progress}%` }} />
        </div>
        <p className="mt-1 font-mono text-[8px] leading-snug text-dim">
          Transit progress is a demonstration figure derived from the current range and planned leg distance.
        </p>
      </div>
    </Panel>
  );
}

export function CrewStatusPanel() {
  const { subjectId, setSubjectId } = useCrew();
  const { push } = useToast();
  const crew = getCrew();

  return (
    <Panel
      label="Crew / roster"
      title={`${crew.length} crew aboard`}
      action={<DemoTag />}
      flush
    >
      <ul className="divide-y divide-line/40">
        {crew.map((member) => {
          const summary = getSubjectSummary(member.id);
          const active = member.id === subjectId;
          return (
            <li key={member.id} className="relative">
              <button
                type="button"
                onClick={() => {
                  setSubjectId(member.id);
                  push({
                    title: `Viewing ${member.name}`,
                    description: "Active crew member updated across every screen.",
                    tone: "info",
                  });
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-2.5 py-2 text-left transition-colors",
                  active ? "bg-signal/6" : "hover:bg-panel-2/60",
                )}
              >
                <span
                  className="grid size-7 shrink-0 place-items-center rounded-full border font-mono text-[9px]"
                  style={{
                    borderColor: `${LEVELS[summary.overall].hex}55`,
                    color: LEVELS[summary.overall].hex,
                    background: `${LEVELS[summary.overall].hex}12`,
                  }}
                >
                  {member.id}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[11px] text-ink">{member.name}</span>
                    {active && <Check className="size-3 shrink-0 text-signal" />}
                  </span>
                  <span className="block truncate font-mono text-[8.5px] uppercase tracking-[0.06em] text-dim">
                    {member.role}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <LevelBadge level={summary.overall} size="xs" />
                  <span className="mt-0.5 block font-mono text-[8px] text-dim">
                    {summary.flagged.length
                      ? `${summary.flagged.length} flagged`
                      : `${summary.latest.length} clear`}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between gap-2 border-t border-line/60 px-2.5 py-1.5">
        <span className="font-mono text-[8px] text-dim">
          {formatRelative(MISSION.now, MISSION.now)} · demo snapshot
        </span>
        <Link
          href="/biometrics"
          className="inline-flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-[0.1em] text-mute hover:text-signal"
        >
          Crew vitals <ArrowUpRight className="size-2.5" />
        </Link>
      </div>
    </Panel>
  );
}

export function SectionIndex() {
  const { subjectId } = useCrew();
  const heart = getLatestFor(subjectId, "heart_rate");
  const flagged = getFlagged(subjectId);
  const flaggedSystems = BODY_SYSTEMS.filter((system) =>
    system.metricIds.some((id) => {
      const latest = getLatestMetric(subjectId, id);
      return latest && latest.level !== "normal";
    }),
  ).length;
  const countermeasures = HAZARDS.reduce((sum, hazard) => sum + hazard.countermeasures.length, 0);

  const stats: Record<string, { value: string; label: string; tone?: string }> = {
    "/": { value: `${MISSION_DAY}d`, label: "mission elapsed" },
    "/biometrics": {
      value: heart ? formatMetricValue(heart.metric, heart.value) : "—",
      label: `${flagged.length} flagged readings`,
      tone: heart ? LEVELS[heart.level].text : undefined,
    },
    "/digital-human": {
      value: `${BODY_SYSTEMS.length - flaggedSystems}/${BODY_SYSTEMS.length}`,
      label: "systems within range",
      tone: flaggedSystems ? "text-amber" : "text-aurora",
    },
    "/assessment": { value: `${ASSESSMENTS.length}`, label: "guided checks" },
    "/hazards": { value: `${HAZARDS.length}`, label: `${countermeasures} countermeasures` },
  };

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <div className="flex items-center gap-2">
          <span className="label-tech">Platform map</span>
          <span className="h-2.5 w-px bg-line" />
          <span className="font-mono text-[8.5px] text-dim">five sections, one shell</span>
        </div>
        <Link
          href="/hazards"
          className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-mute hover:text-signal"
        >
          Explore hazards
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const stat = stats[item.href];
          const isCurrent = item.href === "/";
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isCurrent ? "page" : undefined}
              className={cn(
                "panel group relative flex flex-col overflow-hidden p-3 transition-colors",
                isCurrent ? "border-signal/40 bg-signal/4" : "hover:border-edge/90",
              )}
            >
              <div className="flex items-start justify-between">
                <span
                  className={cn(
                    "grid size-7 place-items-center rounded-md border",
                    isCurrent
                      ? "border-signal/40 bg-signal/10 text-signal"
                      : "border-line bg-deep/60 text-mute group-hover:text-signal",
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <span className="font-mono text-[8.5px] tracking-[0.12em] text-dim">{item.index}</span>
              </div>
              <h3 className="mt-2 text-[11.5px] font-medium text-ink group-hover:text-signal">{item.label}</h3>
              <p className="mt-0.5 line-clamp-2 text-[9.5px] leading-snug text-dim">{item.description}</p>
              <div className="mt-auto flex items-baseline justify-between gap-2 border-t border-line/60 pt-1.5">
                <span className={cn("num text-[12px] text-ink", stat.tone)}>{stat.value}</span>
                <span className="truncate font-mono text-[8px] uppercase tracking-[0.06em] text-dim">
                  {stat.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/** Compact strip of mission-wide numbers used under the hero. */
export function SnapshotStrip() {
  const { subjectId } = useCrew();
  const summary = getSubjectSummary(subjectId);
  const crew = getCrew();
  const flaggedAll = crew.reduce((sum, member) => sum + getFlagged(member.id).length, 0);

  const items = [
    { label: "Indicators tracked", value: String(summary.latest.length), hint: "Vital channels recorded for the active crew member" },
    { label: "Flagged across crew", value: String(flaggedAll), hint: "Latest readings outside the configured normal range" },
    { label: "Assessments", value: String(ASSESSMENTS.length), hint: "Guided checks available in this build" },
    { label: "Countermeasures", value: String(HAZARDS.reduce((sum, h) => sum + h.countermeasures.length, 0)), hint: "Mapped to the five flight hazards" },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="panel px-3 py-2" title={item.hint}>
          <div className="label-tech text-[8px]">{item.label}</div>
          <div className="num mt-1 text-[17px] leading-none text-ink">{item.value}</div>
        </div>
      ))}
    </div>
  );
}
