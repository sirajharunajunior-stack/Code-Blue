import { useCallback, useEffect, useState } from "react";

import {
  acknowledgeAlert,
  disconnectDemo,
  getSnapshot,
  reconnectDemo,
  setScenario,
  startDemo,
  stopDemo,
  websocketUrl,
} from "../lib/api";
import type { Scenario, Snapshot } from "../types";

export function useMonitor() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [socketOpen, setSocketOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applySnapshot = useCallback((next: Snapshot) => {
    setSnapshot(next);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const next = await getSnapshot();
      applySnapshot(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Backend unavailable");
    }
  }, [applySnapshot]);

  useEffect(() => {
    let stopped = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: number | undefined;

    void refresh();

    const connect = () => {
      if (stopped) return;
      socket = new WebSocket(websocketUrl());
      socket.onopen = () => {
        if (!stopped) {
          setSocketOpen(true);
          setError(null);
        }
      };
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as {
            type?: string;
            data?: Snapshot;
          };
          if (message.type === "snapshot" && message.data) {
            applySnapshot(message.data);
            setError(null);
          }
        } catch {
          return;
        }
      };
      socket.onerror = () => socket?.close();
      socket.onclose = () => {
        if (!stopped) {
          setSocketOpen(false);
          reconnectTimer = window.setTimeout(connect, 2000);
        }
      };
    };

    connect();
    const pollTimer = window.setInterval(() => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        void refresh();
      }
    }, 5000);
    const resyncTimer = window.setInterval(() => {
      void refresh();
    }, 15000);

    return () => {
      stopped = true;
      window.clearInterval(pollTimer);
      window.clearInterval(resyncTimer);
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [applySnapshot, refresh]);

  const run = useCallback(
    async (label: string, action: () => Promise<{ snapshot: Snapshot }>) => {
      setBusy(label);
      setError(null);
      try {
        const result = await action();
        applySnapshot(result.snapshot);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Action failed");
      } finally {
        setBusy(null);
      }
    },
    [applySnapshot],
  );

  const start = useCallback(() => run("start", startDemo), [run]);
  const stop = useCallback(() => run("stop", stopDemo), [run]);
  const scenario = useCallback(
    (next: Scenario) => run(`scenario-${next}`, () => setScenario(next)),
    [run],
  );
  const disconnect = useCallback(() => run("disconnect", disconnectDemo), [run]);
  const reconnect = useCallback(() => run("reconnect", reconnectDemo), [run]);
  const acknowledge = useCallback(
    async (alertId: number) => {
      setBusy(`ack-${alertId}`);
      setError(null);
      try {
        await acknowledgeAlert(alertId);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not acknowledge alert");
      } finally {
        setBusy(null);
      }
    },
    [refresh],
  );

  return {
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
  };
}
