import type { Metadata } from "next";
import { AssessmentScreen } from "@/components/assessment/AssessmentScreen";

export const metadata: Metadata = {
  title: "Guided clinical self-assessment",
  description:
    "Step-by-step astronaut health assessments with instructions, validated inputs, reference-range classification and clear escalation guidance.",
};

export default function AssessmentPage() {
  return <AssessmentScreen />;
}
