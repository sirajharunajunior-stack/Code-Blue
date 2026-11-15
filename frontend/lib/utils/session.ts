/**
 * sessionStorage helpers for cross-page deep links.
 *
 * Storage can throw (private browsing, disabled cookies, hardened enterprise
 * policies). Navigation must still work in that case, so every access is
 * best-effort and the destination page simply falls back to its default state.
 */
export function readSession(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Read and clear a one-shot deep-link key. */
export function takeSession(key: string): string | null {
  const value = readSession(key);
  if (value !== null) {
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      /* Nothing else to do; the value is still returned. */
    }
  }
  return value;
}

export function writeSession(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    /* The destination page falls back to its default selection. */
  }
}
