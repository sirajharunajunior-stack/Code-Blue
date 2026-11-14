import { useEffect, useRef, useState, type FormEvent } from "react";

import { StatusPill } from "../components/StatusPill";
import { sendChat } from "../lib/api";
import { formatVitalValue } from "../lib/format";
import type { ChatMessage, Snapshot } from "../types";

const SUGGESTIONS = [
  "What is my current status?",
  "Explain the active alert",
  "What should I do next?",
];

export function Assistant({ snapshot }: { snapshot: Snapshot }) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      role: "assistant",
      content:
        snapshot.active_alerts.length > 0
          ? `Monitoring shows ${snapshot.overall.label.toLowerCase()}. Ask me to explain an alert, a vital sign, or the next action.`
          : "Live vitals are within expected ranges. Ask about a vital sign, an alert, or next actions.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, sending]);

  const submitText = async (text: string) => {
    const message = text.trim();
    if (!message || sending) return;
    setChatError(null);
    const history = messages.map((item) => ({
      role: item.role,
      content: item.content,
    }));
    setMessages((current) => [...current, { role: "user", content: message }]);
    setInput("");
    setSending(true);
    try {
      const response = await sendChat(message, history);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: response.reply,
          aiStatus: response.ai_status,
        },
      ]);
    } catch (error) {
      setChatError(
        error instanceof Error ? error.message : "The assistant is unavailable.",
      );
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitText(input);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <p className="eyebrow">AI assistant</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Ask the monitor
          </h1>
          <p className="mt-1 text-sm text-muted">
            Answers use the current simulated telemetry only.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill
            status={
              snapshot.ai.enabled ? "normal" : "no_signal"
            }
            label={snapshot.ai.enabled ? "AI online" : "Safety fallback"}
          />
          <span className="chip">{snapshot.overall.label}</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="card flex min-h-[34rem] flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
            <div>
              <p className="text-sm font-bold">Crew assistant</p>
              <p className="mt-0.5 text-[10px] text-muted">
                No diagnosis, medication advice, or invented readings.
              </p>
            </div>
            <span className="chip">DEMO</span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={
                  message.role === "user"
                    ? "ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-3 text-sm text-white"
                    : "mr-auto w-fit max-w-[90%] rounded-2xl rounded-bl-md border border-line bg-canvas px-4 py-3 text-sm text-ink"
                }
              >
                <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                {message.role === "assistant" && message.aiStatus && (
                  <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.14em] text-muted">
                    {message.aiStatus === "ready"
                      ? "AI response"
                      : "Safety fallback"}
                  </p>
                )}
              </div>
            ))}
            {sending && (
              <div className="mr-auto w-fit max-w-[90%] rounded-2xl rounded-bl-md border border-line bg-canvas px-4 py-3 text-sm text-muted">
                Reviewing live readings…
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-2 px-4 pb-3 sm:px-5">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="btn btn-quiet text-[11px]"
                  onClick={() => void submitText(suggestion)}
                  disabled={sending}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {chatError && (
            <p className="px-4 pb-3 text-[11px] text-crit sm:px-5">{chatError}</p>
          )}

          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 border-t border-line bg-surface p-3 sm:p-4"
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about a vital sign or alert…"
              className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink outline-none placeholder:text-muted/70 focus:border-brand"
              maxLength={1000}
              disabled={sending}
              aria-label="Message the assistant"
            />
            <button
              type="submit"
              className="btn btn-primary h-11 px-5"
              disabled={!input.trim() || sending}
            >
              Send
            </button>
          </form>
        </section>

        <aside className="space-y-4">
          <section className="card p-4">
            <p className="eyebrow">Context</p>
            <dl className="mt-3 space-y-2.5 text-[12px]">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted">Status</dt>
                <dd className="font-semibold">{snapshot.overall.label}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted">Wearable</dt>
                <dd className="font-semibold">
                  {snapshot.device.connected ? "Connected" : "No signal"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted">Alerts</dt>
                <dd className="font-semibold">{snapshot.active_alerts.length} active</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted">Model</dt>
                <dd className="truncate font-semibold">
                  {snapshot.ai.enabled ? snapshot.ai.model : "Fallback"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="card p-4">
            <p className="eyebrow">Live values</p>
            <div className="mt-3 space-y-2.5">
              {snapshot.vitals.map((vital) => (
                <div
                  key={vital.key}
                  className="flex items-center justify-between gap-2 text-[12px]"
                >
                  <span className="text-muted">{vital.label}</span>
                  <span className="numeric font-semibold">
                    {formatVitalValue(vital.value)} {vital.unit}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {snapshot.active_alerts.length > 0 && (
            <section className="card p-4">
              <p className="eyebrow">Active alerts</p>
              <ul className="mt-3 space-y-2">
                {snapshot.active_alerts.slice(0, 3).map((alert) => (
                  <li key={alert.id} className="text-[12px] font-medium leading-snug">
                    {alert.title}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="px-1 text-[10px] leading-relaxed text-muted">
            Research prototype. Simulated data. Not for medical decisions.
          </p>
        </aside>
      </div>
    </div>
  );
}
