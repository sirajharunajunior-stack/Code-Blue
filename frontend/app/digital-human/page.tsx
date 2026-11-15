import type { Metadata } from "next";
import { DigitalHumanScreen } from "@/components/anatomy/DigitalHumanScreen";

export const metadata: Metadata = {
  title: "Body map",
  description: "Readings and guidance by body area.",
};

export default function DigitalHumanPage() {
  return <DigitalHumanScreen />;
}
