import type { Metadata } from "next";
import { OverviewScreen } from "@/components/overview/OverviewScreen";

export const metadata: Metadata = {
  title: "Deep space · Platform overview",
  description:
    "ASTRA platform overview: mission status, crew health, the five application sections and the shared design system for astronaut health monitoring.",
};

export default function HomePage() {
  return <OverviewScreen />;
}
