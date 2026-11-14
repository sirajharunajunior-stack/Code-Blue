import type { Metadata } from "next";
import { DigitalHumanScreen } from "@/components/anatomy/DigitalHumanScreen";

export const metadata: Metadata = {
  title: "Digital human",
  description:
    "Interactive body explorer: select a body system to see its indicators, spaceflight risks, recorded measurements and linked guided assessment.",
};

export default function DigitalHumanPage() {
  return <DigitalHumanScreen />;
}
