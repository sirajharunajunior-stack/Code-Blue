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
    label: "Overview",
    short: "Home",
    description: "Crew and mission at a glance",
    icon: Orbit,
  },
  {
    index: "02",
    href: "/biometrics",
    label: "Vitals",
    short: "Vitals",
    description: "Readings, trends and alerts",
    icon: Activity,
  },
  {
    index: "03",
    href: "/digital-human",
    label: "Body map",
    short: "Body",
    description: "Readings by body system",
    icon: User,
  },
  {
    index: "04",
    href: "/assessment",
    label: "Health checks",
    short: "Checks",
    description: "Short guided self-checks",
    icon: ClipboardCheck,
  },
  {
    index: "05",
    href: "/hazards",
    label: "Hazards",
    short: "Hazards",
    description: "Risks and protection",
    icon: Radiation,
  },
];

export function navItemFor(pathname: string): NavItem {
  if (pathname === "/") return NAV_ITEMS[0];
  return NAV_ITEMS.find((item) => item.href !== "/" && pathname.startsWith(item.href)) ?? NAV_ITEMS[0];
}
