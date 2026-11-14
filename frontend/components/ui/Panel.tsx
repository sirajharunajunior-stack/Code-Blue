import { cn } from "@/lib/utils/cn";

interface PanelProps {
  children: React.ReactNode;
  className?: string;
  /** Anchor id, used for deep links such as /biometrics#alerts. */
  id?: string;
  /** Mono micro-label shown above the title, e.g. "VITALS / LIVE". */
  label?: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  /** Removes the internal padding — useful for tables and charts. */
  flush?: boolean;
  corners?: boolean;
  bodyClassName?: string;
}

/** The single surface primitive used by every screen. */
export function Panel({
  children,
  className,
  id,
  label,
  title,
  description,
  action,
  flush,
  corners,
  bodyClassName,
}: PanelProps) {
  const hasHeader = Boolean(label || title || action || description);

  return (
    <section id={id} className={cn("panel", corners && "panel-corners", className)}>
      {hasHeader && (
        <header className="flex items-start justify-between gap-3 border-b border-line/70 px-3.5 py-2.5">
          <div className="min-w-0">
            {label && <div className="label-tech mb-1">{label}</div>}
            {title && (
              <h2 className="truncate text-[13px] font-medium tracking-[0.01em] text-ink">{title}</h2>
            )}
            {description && (
              <p className="mt-0.5 text-[11px] leading-snug text-mute">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={cn(flush ? "" : "p-3.5", bodyClassName)}>{children}</div>
    </section>
  );
}

/** Thin divider with a centred technical label. */
export function PanelDivider({ label }: { label?: string }) {
  if (!label) return <div className="hairline my-3" />;
  return (
    <div className="my-3 flex items-center gap-2">
      <div className="hairline flex-1" />
      <span className="label-tech whitespace-nowrap">{label}</span>
      <div className="hairline flex-1" />
    </div>
  );
}
