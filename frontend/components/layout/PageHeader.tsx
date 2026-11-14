import { cn } from "@/lib/utils/cn";

/** Consistent page heading: section index, title, one-line purpose, actions. */
export function PageHeader({
  index,
  section,
  title,
  description,
  actions,
  meta,
  className,
}: {
  index: string;
  section: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] tracking-[0.16em] text-signal/80">{index}</span>
          <span className="h-2.5 w-px bg-line" />
          <span className="label-tech">{section}</span>
        </div>
        <h1 className="mt-1 text-[19px] font-semibold leading-tight tracking-[-0.01em] text-ink sm:text-[21px]">
          {title}
        </h1>
        <p className="mt-1 max-w-2xl text-[11.5px] leading-relaxed text-mute">{description}</p>
        {meta && <div className="mt-2 flex flex-wrap items-center gap-1.5">{meta}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-1.5">{actions}</div>}
    </div>
  );
}
