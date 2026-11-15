"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_SUBJECT_ID, getCrew, getSubject } from "@/lib/data";
import type { Subject } from "@/types";

interface CrewContextValue {
  subjectId: string;
  subject: Subject;
  crew: Subject[];
  setSubjectId: (id: string) => void;
}

const CrewContext = createContext<CrewContextValue | null>(null);
const STORAGE_KEY = "astra:active-crew";

/**
 * Active crew member for the whole app. Persisted locally so a page change or
 * reload does not lose the person you were looking at. The initial value is
 * always the default subject, then restored in an effect, which keeps the
 * server and client markup identical.
 */
export function CrewProvider({ children }: { children: React.ReactNode }) {
  const [subjectId, setSubjectIdState] = useState(DEFAULT_SUBJECT_ID);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      /* Storage can be unavailable in private browsing or hardened deployments. */
      return;
    }
    if (!stored || !getCrew().some((s) => s.id === stored)) return;
    /* Deferred so the restore is a background update rather than an effect that
       immediately cascades a second render. */
    const timer = window.setTimeout(() => setSubjectIdState(stored), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const setSubjectId = useCallback((id: string) => {
    setSubjectIdState(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* Keep the in-memory selection even if it cannot be persisted. */
    }
  }, []);

  const value = useMemo<CrewContextValue>(
    () => ({
      subjectId,
      subject: getSubject(subjectId),
      crew: getCrew(),
      setSubjectId,
    }),
    [subjectId, setSubjectId],
  );

  return <CrewContext.Provider value={value}>{children}</CrewContext.Provider>;
}

export function useCrew() {
  const context = useContext(CrewContext);
  if (!context) throw new Error("useCrew must be used inside <CrewProvider>");
  return context;
}
