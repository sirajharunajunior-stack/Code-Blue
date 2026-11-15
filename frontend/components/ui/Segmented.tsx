"use client";

import { cn } from "@/lib/utils/cn";

interface Option<T extends string | number> {
  value: T;
  label: string;
  hint?: string;
}

interface SegmentedProps<T extends string | number> {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "xs" | "sm";
  className?: string;
  ariaLabel?: string;
}

/** Compact segmented control — the default way to switch a view or a range. */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  size = "xs",
  className,
  ariaLabel,
}: SegmentedProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md border border-line bg-deep/60 p-0.5",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            aria-pressed={active}
            title={option.hint}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-[5px] font-mono uppercase tracking-[0.12em] transition-colors",
              size === "xs" ? "px-2 py-1 text-[9px]" : "px-2.5 py-1.5 text-[10px]",
              active
                ? "bg-signal/15 text-signal shadow-[inset_0_0_0_1px_rgba(79,240,228,0.35)]"
                : "text-mute hover:bg-panel-2 hover:text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
