"use client";

import { ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Badge";
import {
  MissionStatusPanel,
  CrewStatusPanel,
  SectionIndex,
} from "@/components/overview/MissionPanels";
import { useCrew } from "@/components/providers/CrewProvider";
import { MISSION, MISSION_DAY } from "@/lib/data";

export function OverviewScreen() {
  const { subject } = useCrew();

  return (
    <div className="space-y-4">
      <PageHeader
        index="01"
        section="Overview"
        title="Crew health at a glance"
        description="See how the crew is doing today, then open the detail you need."
        meta={
          <>
            <Chip tone="accent">{MISSION.name}</Chip>
            <Chip>Flight day {MISSION_DAY}</Chip>
            <Chip>Viewing {subject.name}</Chip>
          </>
        }
        actions={
          <>
            <Button href="/digital-human" variant="outline" size="sm">
              Body map
            </Button>
            <Button href="/biometrics" variant="primary" size="sm">
              Open vitals <ArrowUpRight className="size-3" />
            </Button>
          </>
        }
      />

      <div className="grid gap-2.5 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <MissionStatusPanel />
        </div>
        <div className="xl:col-span-4">
          <CrewStatusPanel />
        </div>
      </div>

      <SectionIndex />

      <p className="panel px-3 py-2.5 text-[10px] leading-relaxed text-dim">
        Demo data from a simulation, not real astronaut records. Informational only — not a medical device.
      </p>
    </div>
  );
}
