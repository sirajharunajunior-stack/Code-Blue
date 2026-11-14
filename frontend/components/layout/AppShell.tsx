"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <div className="relative z-10 flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] border-r border-line/70 lg:block">
          <Sidebar />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col lg:pl-[232px]">
          <TopBar onMenu={() => setMenuOpen(true)} />
          <main className="mx-auto w-full max-w-[1500px] flex-1 px-3 pb-6 pt-3.5 sm:px-5">{children}</main>
          <footer className="border-t border-line/60 px-4 py-3 sm:px-5">
            <div className="mx-auto flex max-w-[1500px] flex-col gap-1 text-[9.5px] leading-relaxed text-dim sm:flex-row sm:items-center sm:justify-between">
              <p>
                ASTRA · astronaut health monitoring &amp; self-assessment · demonstration build
              </p>
              <p>
                Informational only. Not a medical device. No clinical decision should be made from this
                interface without the flight surgeon.
              </p>
            </div>
          </footer>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-void/80 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 340, damping: 34 }}
              className="absolute inset-y-0 left-0 w-[272px] border-r border-line bg-void"
            >
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close navigation"
                className="absolute right-2 top-2 z-10 rounded-md border border-line p-1.5 text-mute hover:text-ink"
              >
                <X className="size-3.5" />
              </button>
              <Sidebar onNavigate={() => setMenuOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
