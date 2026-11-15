import type { Subject } from "@/types";

/**
 * Demonstration crew.
 *
 * Subject ids (A1–A3) and their sensor baselines come from the health.db
 * snapshot; the callsigns, roles and flight days are fictional and exist only
 * to make the interface legible. No real astronaut data is used anywhere.
 */
export const SUBJECTS: Subject[] = [
  {
    id: "A1",
    name: "Cmdr. I. Okafor",
    role: "Mission commander",
    agency: "CODE-BLUE demo crew",
    environment: "free_space",
    missionDay: 214,
    careerLimit: 600,
  },
  {
    id: "A2",
    name: "Dr. L. Marchetti",
    role: "Flight surgeon",
    agency: "CODE-BLUE demo crew",
    environment: "free_space",
    missionDay: 214,
    careerLimit: 600,
  },
  {
    id: "A3",
    name: "Eng. R. Nakamura",
    role: "Systems engineer",
    agency: "CODE-BLUE demo crew",
    environment: "free_space",
    missionDay: 214,
    careerLimit: 600,
  },
];

export const DEFAULT_SUBJECT_ID = "A1";

export function getSubject(id: string): Subject {
  return SUBJECTS.find((s) => s.id === id) ?? SUBJECTS[0];
}

export function getCrew() {
  return SUBJECTS.filter((s) => s.id !== "local");
}
