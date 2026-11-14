import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** Native <details> disclosure — keyboard accessible with no client JavaScript. */
export function Disclosure({
  title,
  children,
  defaultOpen,
  className,
  meta,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  meta?: React.ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className={cn(
        "group rounded-md border border-line/80 bg-deep/40 transition-colors open:border-edge/80",
        className,
      )}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-[11.5px] text-ink/90 marker:hidden hover:text-ink">
        <span className="flex items-center gap-2">
          <ChevronDown className="size-3 text-dim transition-transform group-open:rotate-180" />
          {title}
        </span>
        {meta}
      </summary>
      <div className="border-t border-line/60 px-3 py-2.5 text-[11.5px] leading-relaxed text-mute">
        {children}
      </div>
    </details>
  );
}
