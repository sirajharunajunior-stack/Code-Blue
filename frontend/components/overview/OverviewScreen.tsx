"use client";

import { ArrowUpRight, Info, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Chip, DemoTag } from "@/components/ui/Badge";
import { MissionStatusPanel, CrewStatusPanel, SectionIndex, SnapshotStrip } from "@/components/overview/MissionPanels";
import { DesignSystemSection } from "@/components/overview/DesignSystem";
import { useCrew } from "@/components/providers/CrewProvider";
import { MISSION, MISSION_DAY } from "@/lib/data/mission";
import { ASSESSMENTS } from "@/lib/data/assessments";
import { HAZARDS } from "@/lib/data/hazards";

export function OverviewScreen() {
  const { subject } = useCrew();

  return (
    <div className="space-y-4">
      <PageHeader
        index="01"
        section="Deep space / platform identity"
        title="ASTRA — astronaut health telemetry"
        description="A single workspace for crew health on long-duration missions: biometric monitoring, an interactive body explorer, guided self-assessment and the five spaceflight hazards."
        meta={
          <>
            <Chip tone="accent">{MISSION.name}</Chip>
            <Chip>Flight day {MISSION_DAY}</Chip>
            <Chip>Active crew · {subject.name}</Chip>
            <Chip tone="muted">
              {ASSESSMENTS.length} assessments · {HAZARDS.length} hazards
            </Chip>
          </>
        }
        actions={
          <>
            <Button href="/digital-human" variant="outline" size="sm">
              Body explorer
            </Button>
            <Button href="/biometrics" variant="primary" size="sm">
              Open biometrics <ArrowUpRight className="size-3" />
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

      <SnapshotStrip />

      <SectionIndex />

      <DesignSystemSection />

      <section className="panel flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-start">
        <div className="flex items-start gap-2">
          <Info className="mt-px size-3.5 shrink-0 text-signal/70" />
          <div>
            <p className="text-[10.5px] leading-relaxed text-mute">
              All readings are a demonstration snapshot exported from{" "}
              <code className="font-mono text-signal/80">health.db</code>; the crew, mission and exposure
              figures are fictional. Thresholds are the database&apos;s configured reference ranges, shown
              with the level colours the backend assigns.
            </p>
            <p className="mt-1 text-[9.5px] leading-relaxed text-dim">
              Replacing <code className="font-mono">lib/data/*.json</code> with a fetch to{" "}
              <code className="font-mono">/api/latest</code>, <code className="font-mono">/api/history</code>{" "}
              and <code className="font-mono">/api/daily</code> is the only change needed to run against the
              FastAPI service in the repository root.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:ml-auto">
          <DemoTag />
          <span className="inline-flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-[0.1em] text-dim">
            <ShieldAlert className="size-2.5" /> Not a medical device
          </span>
        </div>
      </section>
    </div>
  );
}
