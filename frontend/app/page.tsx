import type { Metadata } from "next";
import { OverviewScreen } from "@/components/overview/OverviewScreen";

export const metadata: Metadata = {
  title: "Overview",
  description: "Crew health and mission at a glance.",
};

export default function HomePage() {
  return <OverviewScreen />;
}
