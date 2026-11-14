import { Activity, ClipboardCheck, Orbit, Radiation, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  index: string;
  href: string;
  label: string;
  /** Short label used in the mobile bar. */
  short: string;
  description: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  {
    index: "01",
    href: "/",
    label: "Deep space",
    short: "Overview",
    description: "Platform identity, mission status, crew",
    icon: Orbit,
  },
  {
    index: "02",
    href: "/biometrics",
    label: "Biometrics",
    short: "Vitals",
    description: "Live readings, trends and alerts",
    icon: Activity,
  },
  {
    index: "03",
    href: "/digital-human",
    label: "Digital human",
    short: "Body",
    description: "Explore systems and their flight risks",
    icon: User,
  },
  {
    index: "04",
    href: "/assessment",
    label: "Assessment",
    short: "Assess",
    description: "Guided clinical self-checks",
    icon: ClipboardCheck,
  },
  {
    index: "05",
    href: "/hazards",
    label: "Hazards",
    short: "Hazards",
    description: "Five spaceflight hazards and countermeasures",
    icon: Radiation,
  },
];

export function navItemFor(pathname: string): NavItem {
  if (pathname === "/") return NAV_ITEMS[0];
  return NAV_ITEMS.find((item) => item.href !== "/" && pathname.startsWith(item.href)) ?? NAV_ITEMS[0];
}
