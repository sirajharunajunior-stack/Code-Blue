import type { Alert, Scenario, Snapshot } from "../types";

const API_BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {}
    throw new Error(detail);
  }
  return (await response.json()) as T;
}

export function getSnapshot(): Promise<Snapshot> {
  return request<Snapshot>("/api/snapshot");
}

export function startDemo(): Promise<{ snapshot: Snapshot }> {
  return request("/api/demo/start", { method: "POST" });
}

export function stopDemo(): Promise<{ snapshot: Snapshot }> {
  return request("/api/demo/stop", { method: "POST" });
}

export function setScenario(scenario: Scenario): Promise<{ snapshot: Snapshot }> {
  return request("/api/demo/scenario", {
    method: "POST",
    body: JSON.stringify({ scenario }),
  });
}

export function disconnectDemo(): Promise<{ snapshot: Snapshot }> {
  return request("/api/demo/disconnect", { method: "POST" });
}

export function reconnectDemo(): Promise<{ snapshot: Snapshot }> {
  return request("/api/demo/reconnect", { method: "POST" });
}

export function acknowledgeAlert(
  alertId: number,
): Promise<{ alert: Alert }> {
  return request(`/api/alerts/${alertId}/acknowledge`, { method: "POST" });
}

export function sendChat(
  message: string,
  history: { role: "user" | "assistant"; content: string }[],
): Promise<{ reply: string; ai_status: "ready" | "fallback"; generated_at: string }> {
  return request("/api/ai/chat", {
    method: "POST",
    body: JSON.stringify({ message, history: history.slice(-8) }),
  });
}

export function websocketUrl(): string {
  const configured = import.meta.env.VITE_WS_URL;
  if (configured) return configured;
  if (API_BASE) {
    const url = new URL(API_BASE);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/ws";
    return url.toString();
  }
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
}
