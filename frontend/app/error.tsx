"use client";

import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";

/** Client error boundary: a failed render must not leave a blank screen. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="panel max-w-md px-5 py-6 text-center">
        <TriangleAlert className="mx-auto size-6 text-amber" />
        <h1 className="mt-3 text-[18px] font-medium text-ink">Something went wrong</h1>
        <p className="mt-1.5 text-[11px] leading-relaxed text-mute">
          The page could not be displayed. Try again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-signal/40 bg-signal/8 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-signal transition-colors hover:bg-signal/14"
        >
          <RotateCcw className="size-3" /> Try again
        </button>
      </div>
    </div>
  );
}
