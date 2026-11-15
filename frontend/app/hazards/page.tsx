import type { Metadata } from "next";
import { HazardScreen } from "@/components/hazards/HazardScreen";

export const metadata: Metadata = {
  title: "Hazards",
  description: "Long-flight risks and the steps that reduce them.",
};

export default function HazardsPage() {
  return <HazardScreen />;
}
