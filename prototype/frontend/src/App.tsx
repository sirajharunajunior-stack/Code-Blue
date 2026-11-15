import { useState } from "react";

import { useMonitor } from "./hooks/useMonitor";
import { cx } from "./lib/format";
import { Alerts } from "./pages/Alerts";
import { Assistant } from "./pages/Assistant";
import { Health } from "./pages/Health";
import { Overview } from "./pages/Overview";

type Page = "overview" | "health" | "assistant" | "alerts";

const TABS: { id: Page; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "health", label: "Health" },
  { id: "assistant", label: "AI Assistant" },
  { id: "alerts", label: "Alerts" },
];

export default function App() {
  const {
    snapshot,
    socketOpen,
    busy,
    error,
    refresh,
    start,
    stop,
    scenario,
    disconnect,
    reconnect,
    acknowledge,
  } = useMonitor();
  const [page, setPage] = useState<Page>("overview");

  if (!snapshot) {
    return (
      <div className="flex min-h-screen items-center justify-center p-5">
        <div className="w-full max-w-md text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-brand">
            CODE-BLUE
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            Connecting to crew monitor
          </h1>
          <p className="mt-2 text-sm text-muted">
            Start the backend and keep the simulated wearable running.
          </p>
          {error && (
            <p className="mt-4 rounded-2xl border border-warn/20 bg-warn-soft p-3 text-xs text-warn">
              {error}
            </p>
          )}
          <button type="button" className="btn btn-primary mt-5" onClick={() => void refresh()}>
            Retry connection
          </button>
        </div>
      </div>
    );
  }

  const activeCount = snapshot.active_alerts.length;
  const critical = snapshot.active_alerts.some(
    (alert) => alert.severity === "critical",
  );

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line/80 bg-canvas/90 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand">
                  CODE-BLUE
                </p>
                <p className="text-sm font-semibold tracking-tight">Crew health monitor</p>
              </div>
              <span className="rounded-full bg-ink px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-white">
                Demo data
              </span>
            </div>

            <div className="flex items-center gap-2">
              {error && (
                <button
                  type="button"
                  className="chip border-warn/25 bg-warn-soft text-warn"
                  onClick={() => void refresh()}
                >
                  Connection issue · retry
                </button>
              )}
              <span
                className={cx(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold",
                  socketOpen
                    ? "border-good/15 bg-good-soft text-good"
                    : "border-line bg-dim-soft text-dim",
                )}
              >
                <span
                  className={cx(
                    "status-dot",
                    socketOpen ? "text-good" : "text-dim",
                    !socketOpen && "status-pulse",
                  )}
                  aria-hidden="true"
                />
                {socketOpen ? "Live" : "Polling"}
              </span>
              {critical && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-crit/15 bg-crit-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-crit">
                  <span className="status-dot status-pulse" aria-hidden="true" />
                  Critical
                </span>
              )}
            </div>
          </div>

          <nav
            className="flex gap-1 overflow-x-auto pb-2"
            aria-label="Sections"
          >
            {TABS.map((tab) => {
              const active = page === tab.id;
              const count = tab.id === "alerts" ? activeCount : 0;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPage(tab.id)}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "relative shrink-0 rounded-t-lg px-3 py-2 text-xs font-semibold transition",
                    active
                      ? "bg-surface text-ink shadow-[0_-1px_0_#dce7e0,1px_0_0_#dce7e0,-1px_0_0_#dce7e0]"
                      : "text-muted hover:bg-white/60 hover:text-ink",
                  )}
                >
                  {tab.label}
                  {count > 0 && (
                    <span className="ml-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-crit px-1 py-0.5 text-[9px] leading-none text-white">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
        {page === "overview" && (
          <Overview
            snapshot={snapshot}
            busy={busy}
            onStart={start}
            onStop={stop}
            onScenario={scenario}
            onDisconnect={disconnect}
            onReconnect={reconnect}
            onOpenAlerts={() => setPage("alerts")}
          />
        )}
        {page === "health" && <Health snapshot={snapshot} />}
        {page === "assistant" && <Assistant snapshot={snapshot} />}
        {page === "alerts" && (
          <Alerts
            snapshot={snapshot}
            busy={busy}
            onAcknowledge={acknowledge}
          />
        )}
      </main>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-5 pb-6 pt-3 text-[10px] text-muted sm:px-7">
        <span>CODE-BLUE crew health prototype · simulated telemetry</span>
        <span>Research use only · not for medical decisions</span>
      </footer>
    </div>
  );
}
