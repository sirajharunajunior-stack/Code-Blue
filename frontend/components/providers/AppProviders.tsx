"use client";

import { ToastProvider } from "@/components/ui/Toast";
import { CrewProvider } from "@/components/providers/CrewProvider";

/** Client-side providers shared by every route. */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <CrewProvider>{children}</CrewProvider>
    </ToastProvider>
  );
}
