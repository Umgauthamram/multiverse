"use client";

import React, { useEffect, useCallback } from "react";
import {
  CrisisCategory,
  CrisisHelpline,
  VERIFIED_HELPLINES,
} from "@/lib/safety/crisisInterceptor";

export interface CrisisDialogProps {
  isOpen: boolean;
  onClose: () => void;
  category?: CrisisCategory;
  matchedPattern?: string;
  helplines?: CrisisHelpline[];
  className?: string;
}

export function CrisisDialog({
  isOpen,
  onClose,
  category = "self_harm",
  matchedPattern,
  helplines = [...VERIFIED_HELPLINES],
  className = "",
}: CrisisDialogProps) {
  // Handle ESC key to dismiss dialog
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="crisis-dialog-title"
      aria-describedby="crisis-dialog-desc"
      data-testid="crisis-dialog-modal"
      className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        data-testid="crisis-dialog-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity"
      />

      {/* Modal Surface */}
      <div
        className={`relative z-10 w-full max-w-2xl bg-zinc-950 border border-rose-800/80 rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col gap-6 text-zinc-100 select-none ${className}`}
      >
        {/* Header Badge & Title */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 uppercase tracking-wider font-mono">
              Safety Support Intervention
            </span>
            <span className="text-[10px] uppercase font-mono text-zinc-400">
              {matchedPattern || category.replace("_", " ").toUpperCase()}
            </span>
          </div>

          <h2
            id="crisis-dialog-title"
            className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100"
          >
            Immediate Support & Safety Resources
          </h2>

          <p
            id="crisis-dialog-desc"
            className="text-xs sm:text-sm text-zinc-300 leading-relaxed"
          >
            Multiverse You is a counterfactual simulation engine and cannot provide
            medical or psychological crisis care. If you or someone you know is in
            distress or experiencing severe difficulty, trained human professionals are
            available right now. Support is confidential, free, and available 24/7.
          </p>
        </div>

        {/* Verified Helplines List */}
        <div className="flex flex-col gap-2.5 max-h-[340px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-700">
          {helplines.map((helpline, idx) => (
            <div
              key={idx}
              data-testid={`helpline-card-${idx}`}
              className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-zinc-700 transition-colors"
            >
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-100">
                    {helpline.name}
                  </span>
                  <span className="text-[10px] font-semibold text-zinc-400 font-mono">
                    ({helpline.region})
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-snug">
                  {helpline.description}
                </p>
                <span className="text-[10px] text-emerald-400 font-medium">
                  {helpline.availability}
                </span>
              </div>

              {helpline.directActionUrl && (
                <a
                  href={helpline.directActionUrl}
                  target={helpline.directActionUrl.startsWith("http") ? "_blank" : undefined}
                  rel={helpline.directActionUrl.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-colors text-center"
                >
                  {helpline.contact}
                </a>
              )}
            </div>
          ))}
        </div>

        {/* Footer Acknowledgement */}
        <div className="pt-2 border-t border-zinc-850 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-[11px] text-zinc-400 font-mono">
            Reflective Simulation Engine • Not a Future Prediction
          </span>

          <button
            type="button"
            onClick={onClose}
            data-testid="crisis-dialog-dismiss"
            className="w-full sm:w-auto px-5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold border border-zinc-700 transition-colors"
          >
            I Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
}
