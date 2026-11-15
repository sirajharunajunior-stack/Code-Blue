import type { Metadata } from "next";
import { BiometricsScreen } from "@/components/biometrics/BiometricsScreen";

export const metadata: Metadata = {
  title: "Vitals",
  description: "Latest readings, trends, alerts and radiation dose.",
};

export default function BiometricsPage() {
  return <BiometricsScreen />;
}
