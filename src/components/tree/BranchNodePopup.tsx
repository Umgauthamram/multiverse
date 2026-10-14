"use client";

import React, { useEffect, useCallback } from "react";
import { LifeStats } from "@/lib/simulation/statClamper";
import { LifeEvent } from "@/lib/simulation/eventRoller";
import {
  resolveBranchColor,
  resolveEventSeverityStyle,
} from "@/lib/simulation/branchColorEngine";

export interface BranchNodePopupProps {
  timelineId: string;
  branchName: string;
  branchOption: "A" | "B";
  personaSeed: string;
  quarter: number;
  month: number;
  stats: LifeStats;
  statDeltas?: {
    deltaHappiness?: number;
    deltaHealth?: number;
    deltaRelationships?: number;
    deltaCareer?: number;
  };
  endingSavings?: number;
  netWorthDelta?: number;
  event: LifeEvent;
  diaryEntry?: string;
  reflection?: string;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export function BranchNodePopup({
  branchName,
  branchOption,
  personaSeed,
  quarter,
  month,
  stats,
  statDeltas = {},
  endingSavings,
  netWorthDelta,
  event,
  diaryEntry,
  reflection,
  isOpen,
  onClose,
  className = "",
}: BranchNodePopupProps) {
  // Handle ESC key to dismiss popup
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const branchColor = resolveBranchColor(stats);
  const eventStyle = resolveEventSeverityStyle(event.severity);

  const formatDelta = (val?: number) => {
    if (val === undefined || val === null || val === 0) return "• 0";
    return val > 0 ? `▲ +${val}` : `▼ ${val}`;
  };

  const getDeltaClass = (val?: number) => {
    if (!val || val === 0) return "text-zinc-400";
    return val > 0 ? "text-emerald-400" : "text-rose-400";
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="branch-node-popup"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-lg bg-[#121215] border border-zinc-800 rounded-xl p-5 shadow-2xl flex flex-col gap-4 text-zinc-100 select-none ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-start justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 font-tabular">
                Quarter {quarter} • Month {month}
              </span>
              <span
                className={`text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded border ${branchColor.bgClass} ${branchColor.textClass} ${branchColor.borderClass}`}
              >
                {branchColor.label}
              </span>
            </div>
            <h3 className="text-base font-bold text-zinc-100 tracking-tight">
              Path {branchOption}: {branchName}
            </h3>
            <span className="text-[11px] text-zinc-400 font-medium capitalize">
              Archetype: {personaSeed.replace("_", " ")}
            </span>
          </div>

          <button
            onClick={onClose}
            aria-label="Close inspection popup"
            className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Rolled Event Flash Card */}
        <div className="bg-[#18181b] border border-zinc-800/90 rounded-lg p-3.5 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded border ${eventStyle.bgClass} ${eventStyle.textClass} ${eventStyle.borderClass}`}
            >
              {eventStyle.badgeLabel}
            </span>
            {event.financialImpact && (
              <span className="text-[11px] font-tabular font-medium text-zinc-400">
                Income Multiplier: {event.financialImpact.incomeMultiplier || 1.0}x
              </span>
            )}
          </div>

          <h4 className="text-sm font-semibold text-zinc-200">
            {event.title}
          </h4>
          <p className="text-xs text-zinc-400 leading-relaxed">
            {event.description}
          </p>

          {/* Financial Cash Flow Tag */}
          {(endingSavings !== undefined || netWorthDelta !== undefined) && (
            <div className="flex items-center justify-between pt-1 text-[11px] font-tabular text-zinc-400 border-t border-zinc-800/60">
              {endingSavings !== undefined && (
                <span>Liquid Savings: ${endingSavings.toLocaleString()}</span>
              )}
              {netWorthDelta !== undefined && (
                <span className={netWorthDelta >= 0 ? "text-emerald-400" : "text-rose-400"}>
                  Quarter Cashflow: {netWorthDelta >= 0 ? `+$${netWorthDelta.toLocaleString()}` : `-$${Math.abs(netWorthDelta).toLocaleString()}`}
                </span>
              )}
            </div>
          )}
        </div>

        {/* 4-Stat Delta Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-[#18181b] border border-zinc-850 p-2.5 rounded-lg flex flex-col">
            <span className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">
              Joy
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-base font-bold font-tabular text-zinc-100">
                {stats.happiness}
              </span>
              <span className={`text-[10px] font-bold font-tabular ${getDeltaClass(statDeltas.deltaHappiness)}`}>
                {formatDelta(statDeltas.deltaHappiness)}
              </span>
            </div>
          </div>

          <div className="bg-[#18181b] border border-zinc-850 p-2.5 rounded-lg flex flex-col">
            <span className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">
              Health
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-base font-bold font-tabular text-zinc-100">
                {stats.health}
              </span>
              <span className={`text-[10px] font-bold font-tabular ${getDeltaClass(statDeltas.deltaHealth)}`}>
                {formatDelta(statDeltas.deltaHealth)}
              </span>
            </div>
          </div>

          <div className="bg-[#18181b] border border-zinc-850 p-2.5 rounded-lg flex flex-col">
            <span className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">
              Relations
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-base font-bold font-tabular text-zinc-100">
                {stats.relationships}
              </span>
              <span className={`text-[10px] font-bold font-tabular ${getDeltaClass(statDeltas.deltaRelationships)}`}>
                {formatDelta(statDeltas.deltaRelationships)}
              </span>
            </div>
          </div>

          <div className="bg-[#18181b] border border-zinc-850 p-2.5 rounded-lg flex flex-col">
            <span className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">
              Career
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-base font-bold font-tabular text-zinc-100">
                {stats.career}
              </span>
              <span className={`text-[10px] font-bold font-tabular ${getDeltaClass(statDeltas.deltaCareer)}`}>
                {formatDelta(statDeltas.deltaCareer)}
              </span>
            </div>
          </div>
        </div>

        {/* Authentic Journal Entry Snippet */}
        {diaryEntry && (
          <div className="bg-[#161619] border-l-2 border-zinc-500 p-3 rounded-r-lg flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400">
              Journal Snippet
            </span>
            <p className="text-xs italic text-zinc-300 leading-relaxed font-sans">
              &ldquo;{diaryEntry}&rdquo;
            </p>
            {reflection && (
              <p className="text-[11px] text-zinc-400 mt-1 font-medium">
                Tradeoff: {reflection}
              </p>
            )}
          </div>
        )}

        {/* Dismiss Button */}
        <div className="flex justify-end pt-1">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/80 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
