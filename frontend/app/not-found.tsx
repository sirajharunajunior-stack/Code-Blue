import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="panel max-w-md px-5 py-6 text-center">
        <Compass className="mx-auto size-6 text-signal/70" />
        <h1 className="mt-3 text-[18px] font-medium text-ink">Page not found</h1>
        <p className="mt-1.5 text-[11px] leading-relaxed text-mute">
          This address is not part of CODE-BLUE.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-signal/40 bg-signal/8 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-signal transition-colors hover:bg-signal/14"
        >
          <ArrowLeft className="size-3" /> Back to overview
        </Link>
      </div>
    </div>
  );
}
