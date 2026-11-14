import type { Metadata } from "next";
import { HazardScreen } from "@/components/hazards/HazardScreen";

export const metadata: Metadata = {
  title: "Space hazards & countermeasures",
  description:
    "The five human-spaceflight hazards — radiation, isolation, distance, gravity fields and hostile closed environments — their health effects, indicators and countermeasures.",
};

export default function HazardsPage() {
  return <HazardScreen />;
}
