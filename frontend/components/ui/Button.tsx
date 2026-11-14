import Link from "next/link";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "outline" | "ghost" | "danger" | "subtle";
type Size = "sm" | "md" | "icon";

const BASE =
  "inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-md border font-mono uppercase tracking-[0.12em] transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40";

const VARIANTS: Record<Variant, string> = {
  primary:
    "border-signal/60 bg-signal/12 text-signal hover:bg-signal/20 hover:border-signal/80 shadow-[0_0_18px_-8px_rgba(79,240,228,0.7)]",
  outline: "border-line bg-panel-2/60 text-ink/90 hover:border-edge hover:bg-panel-3/70",
  ghost: "border-transparent bg-transparent text-mute hover:text-ink hover:bg-panel-2/70",
  danger: "border-danger/50 bg-danger/10 text-danger hover:bg-danger/20",
  subtle: "border-line/70 bg-deep/50 text-mute hover:text-ink hover:border-edge",
};

const SIZES: Record<Size, string> = {
  sm: "h-7 px-2.5 text-[10px]",
  md: "h-9 px-3.5 text-[11px]",
  icon: "size-7 p-0",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  href?: string;
}

export function Button({
  variant = "outline",
  size = "sm",
  className,
  children,
  href,
  ...props
}: ButtonProps) {
  const classes = cn(BASE, VARIANTS[variant], SIZES[size], className);

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  );
}
