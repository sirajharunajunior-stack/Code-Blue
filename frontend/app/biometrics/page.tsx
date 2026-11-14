import type { Metadata } from "next";
import { BiometricsScreen } from "@/components/biometrics/BiometricsScreen";

export const metadata: Metadata = {
  title: "Biometric overview",
  description:
    "Live astronaut vitals, configured reference ranges, interactive trends, threshold alerts and radiation exposure for the current crew member.",
};

export default function BiometricsPage() {
  return <BiometricsScreen />;
}
