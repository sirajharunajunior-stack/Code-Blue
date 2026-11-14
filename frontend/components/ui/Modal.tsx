"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** Accessible drawer-style modal used for assessment details and confirmations. */
export function Modal({
  open,
  onClose,
  title,
  label,
  children,
  footer,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  label?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-void/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 24, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.99 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className={cn(
              "panel panel-corners relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-b-none sm:rounded-b-panel",
              width,
            )}
          >
            <header className="flex items-start justify-between gap-4 border-b border-line/70 px-4 py-3">
              <div>
                {label && <div className="label-tech mb-1">{label}</div>}
                <h2 className="text-[14px] font-medium text-ink">{title}</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-md border border-line p-1 text-mute transition-colors hover:border-edge hover:text-ink"
              >
                <X className="size-3.5" />
              </button>
            </header>
            <div className="scroll-thin flex-1 overflow-y-auto px-4 py-3.5">{children}</div>
            {footer && (
              <footer className="flex items-center justify-end gap-2 border-t border-line/70 bg-deep/40 px-4 py-3">
                {footer}
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
