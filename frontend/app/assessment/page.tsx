import type { Metadata } from "next";
import { AssessmentScreen } from "@/components/assessment/AssessmentScreen";

export const metadata: Metadata = {
  title: "Health checks",
  description: "Short guided health checks with clear next steps.",
};

export default function AssessmentPage() {
  return <AssessmentScreen />;
}
