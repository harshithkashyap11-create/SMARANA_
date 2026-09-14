import type { ReactNode } from "react";

import { BigButton } from "./BigButton";
import { useTts } from "../hooks/useTts";

interface ConfirmDialogProps {
  children?: ReactNode;
  noLabel: string;
  onNo: () => void;
  onYes: () => void;
  open: boolean;
  title: string;
  ttsLabel?: string;
  yesLabel: string;
}

export function ConfirmDialog({
  children,
  noLabel,
  onNo,
  onYes,
  open,
  title,
  ttsLabel,
  yesLabel,
}: ConfirmDialogProps) {
  const speak = useTts();
  if (!open) return null;

  return (
    <div
      aria-labelledby="confirm-dialog-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-text/50 p-4"
      role="dialog"
    >
      <section className="w-full max-w-md space-y-5 rounded-card bg-surface p-6 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-3xl font-bold" id="confirm-dialog-title">
            {title}
          </h2>
          {ttsLabel ? (
            <button
              aria-label={ttsLabel}
              className="min-h-touch min-w-16 rounded-card border-2 border-primary"
              type="button"
              onClick={() => speak(title)}
            >
              ◖))
            </button>
          ) : null}
        </div>
        {children}
        <div className="grid gap-3 sm:grid-cols-2">
          <BigButton onClick={onYes}>{yesLabel}</BigButton>
          <BigButton variant="secondary" onClick={onNo}>
            {noLabel}
          </BigButton>
        </div>
      </section>
    </div>
  );
}
