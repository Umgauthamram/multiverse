"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { LifeStats } from "@/lib/simulation/statClamper";
import { TimelineStepDocument } from "@/lib/db/models/Simulation";
import {
  resolveBranchColor,
  resolveEventSeverityStyle,
} from "@/lib/simulation/branchColorEngine";
import { BranchStatusBadge } from "@/components/hud/BranchStatusBadge";

export interface TimelineDetailData {
  timelineId: string;
  branchOption: "A" | "B";
  branchName: string;
  branchLocation: string;
  personaSeed: string;
  personaArchetype?: string;
  totalQuartersCompleted?: number;
  finalStats?: LifeStats;
  finalSavings?: number;
  isBurnedOut?: boolean;
  lowestHappinessQuarter?: number;
  peakCareerQuarter?: number;
}

export interface BranchDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  timeline: TimelineDetailData | null;
  steps: TimelineStepDocument[];
  activeQuarter?: number;
  onSelectQuarter?: (quarter: number) => void;
  className?: string;
}

/**
 * Formats numeric currency into compact or standard USD format.
 */
export function formatCurrency(amount: number): string {
  if (Number.isNaN(amount) || !Number.isFinite(amount)) return "$0";
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(abs);
  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Generates an SVG path string for a mini sparkline chart.
 */
export function generateSparklinePath(
  values: number[],
  width = 120,
  height = 30,
  forcedMin?: number,
  forcedMax?: number
): {
  linePath: string;
  areaPath: string;
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
} {
  if (!values || values.length === 0) {
    const midY = height / 2;
    return {
      linePath: `M 0 ${midY} L ${width} ${midY}`,
      areaPath: `M 0 ${midY} L ${width} ${midY} L ${width} ${height} L 0 ${height} Z`,
      startPoint: { x: 0, y: midY },
      endPoint: { x: width, y: midY },
    };
  }

  const min = forcedMin !== undefined ? forcedMin : Math.min(...values);
  const max = forcedMax !== undefined ? forcedMax : Math.max(...values);
  const range = max - min === 0 ? 1 : max - min;
  const paddingY = 4;
  const usableHeight = height - paddingY * 2;

  const points = values.map((val, idx) => {
    const x = values.length === 1 ? width / 2 : (idx / (values.length - 1)) * width;
    const normalized = (val - min) / range;
    const y = height - paddingY - normalized * usableHeight;
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  });

  const linePath = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, "");

  const lastPt = points[points.length - 1];
  const firstPt = points[0];
  const areaPath = `${linePath} L ${lastPt.x} ${height} L ${firstPt.x} ${height} Z`;

  return {
    linePath,
    areaPath,
    startPoint: firstPt,
    endPoint: lastPt,
  };
}

/**
 * Mini Stat Sparkline Component for Drawer Overview
 */
export function StatSparkline({
  label,
  values,
  strokeColor,
  fillColor,
  currentValue,
  delta,
  minVal = 0,
  maxVal = 100,
  isCurrency = false,
}: {
  label: string;
  values: number[];
  strokeColor: string;
  fillColor: string;
  currentValue?: number;
  delta?: number;
  minVal?: number;
  maxVal?: number;
  isCurrency?: boolean;
}) {
  const { linePath, areaPath, endPoint } = useMemo(
    () => generateSparklinePath(values, 120, 32, minVal, maxVal),
    [values, minVal, maxVal]
  );

  const displayVal =
    currentValue !== undefined
      ? isCurrency
        ? formatCurrency(currentValue)
        : `${Math.round(currentValue)}`
      : "--";

  const displayDelta =
    delta !== undefined
      ? delta > 0
        ? `+${isCurrency ? formatCurrency(delta) : delta}`
        : `${isCurrency ? formatCurrency(delta) : delta}`
      : null;

  return (
    <div
      data-testid={`sparkline-${label.toLowerCase()}`}
      className="flex flex-col p-2.5 rounded-md bg-zinc-900 border border-zinc-800"
    >
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="text-zinc-400 uppercase font-semibold tracking-wider">
          {label}
        </span>
        <div className="flex items-center gap-1 font-tabular font-bold">
          <span className="text-zinc-200">{displayVal}</span>
          {displayDelta && (
            <span
              className={`text-[10px] ${
                (delta || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {displayDelta}
            </span>
          )}
        </div>
      </div>

      <div className="relative w-full h-8 mt-1">
        <svg
          viewBox="0 0 120 32"
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d={areaPath} fill={fillColor} />
          <path
            d={linePath}
            fill="none"
            stroke={strokeColor}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx={endPoint.x}
            cy={endPoint.y}
            r="2.5"
            fill={strokeColor}
            className="animate-pulse"
          />
        </svg>
      </div>
    </div>
  );
}

/**
 * BranchDetailDrawer Component
 * Slide-out deep-dive panel for timeline character profile, diary records, and sparklines.
 */
export function BranchDetailDrawer({
  isOpen,
  onClose,
  timeline,
  steps,
  activeQuarter,
  onSelectQuarter,
  className = "",
}: BranchDetailDrawerProps) {
  const [userSelectedQuarter, setUserSelectedQuarter] = useState<number | null>(
    null
  );

  const defaultQuarter = steps.length > 0 ? steps[steps.length - 1].quarter : 1;
  const selectedQuarter = userSelectedQuarter ?? activeQuarter ?? defaultQuarter;

  // Handle ESC key to dismiss drawer
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

  const sortedSteps = useMemo(() => {
    return [...steps].sort((a, b) => a.quarter - b.quarter);
  }, [steps]);

  const currentStep = useMemo(() => {
    return sortedSteps.find((s) => s.quarter === selectedQuarter) || null;
  }, [sortedSteps, selectedQuarter]);

  const latestRecordedStep = sortedSteps[sortedSteps.length - 1] || null;

  const sparklineData = useMemo(() => {
    const happiness: number[] = [];
    const health: number[] = [];
    const relationships: number[] = [];
    const career: number[] = [];
    const savings: number[] = [];

    sortedSteps.forEach((s) => {
      if (s.stats) {
        happiness.push(s.stats.happiness);
        health.push(s.stats.health);
        relationships.push(s.stats.relationships);
        career.push(s.stats.career);
      }
      savings.push(s.endingSavings || 0);
    });

    return { happiness, health, relationships, career, savings };
  }, [sortedSteps]);

  if (!isOpen || !timeline) {
    return null;
  }

  const latestStats = currentStep?.stats || latestRecordedStep?.stats || timeline.finalStats || {
    happiness: 50,
    health: 50,
    relationships: 50,
    career: 50,
  };

  const branchColor = resolveBranchColor(
    latestStats,
    currentStep?.isBurnedOut || latestRecordedStep?.isBurnedOut || timeline.isBurnedOut
  );

  const eventSeverity = currentStep?.rolledEvent
    ? resolveEventSeverityStyle(currentStep.rolledEvent.severity)
    : null;

  const handleQuarterClick = (q: number) => {
    setUserSelectedQuarter(q);
    if (onSelectQuarter) {
      onSelectQuarter(q);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-branch-title"
      data-testid="branch-detail-drawer"
      className="fixed inset-0 z-50 overflow-hidden flex justify-end"
    >
      {/* Backdrop overlay */}
      <div
        data-testid="drawer-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity duration-200"
      />

      {/* Slide-out Drawer Panel */}
      <div
        className={`relative z-10 w-full max-w-xl h-full bg-zinc-950 border-l border-zinc-800 shadow-2xl flex flex-col text-zinc-100 overflow-y-auto select-none ${className}`}
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-850 bg-zinc-900/60 sticky top-0 z-20 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase tracking-wider">
                  Path {timeline.branchOption}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 uppercase tracking-wider">
                  {timeline.personaArchetype || timeline.personaSeed} Seed
                </span>
                <BranchStatusBadge status={branchColor.status} />
              </div>
              <h2
                id="drawer-branch-title"
                className="text-lg font-bold tracking-tight text-zinc-100"
              >
                {timeline.branchName}
              </h2>
              <p className="text-xs text-zinc-400 font-medium">
                {timeline.branchLocation} • 5-Year Counterfactual Trajectory
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              data-testid="drawer-close-button"
              aria-label="Close drawer"
              className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-transparent hover:border-zinc-700 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Anti-AI-Slop Mandatory Framing Banner */}
          <div className="mt-3 pt-2.5 border-t border-zinc-850/80 flex items-center justify-between text-[10px] text-zinc-400 font-mono uppercase tracking-wider">
            <span>Reflective Simulation Engine</span>
            <span>•</span>
            <span>Not a Future Prediction</span>
          </div>
        </div>

        {/* Mini Sparklines Overview Section */}
        <div className="p-4 sm:p-5 border-b border-zinc-850 flex flex-col gap-3 bg-zinc-950">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              5-Year Trajectory Overview
            </h3>
            <span className="text-[11px] font-tabular text-zinc-400">
              {sortedSteps.length} of 20 Quarters Logged
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatSparkline
              label="Happiness"
              values={sparklineData.happiness}
              strokeColor="#10b981"
              fillColor="rgba(16, 185, 129, 0.08)"
              currentValue={latestStats.happiness}
              delta={currentStep?.statDeltas?.deltaHappiness}
            />
            <StatSparkline
              label="Health"
              values={sparklineData.health}
              strokeColor="#38bdf8"
              fillColor="rgba(56, 189, 248, 0.08)"
              currentValue={latestStats.health}
              delta={currentStep?.statDeltas?.deltaHealth}
            />
            <StatSparkline
              label="Social"
              values={sparklineData.relationships}
              strokeColor="#a855f7"
              fillColor="rgba(168, 85, 247, 0.08)"
              currentValue={latestStats.relationships}
              delta={currentStep?.statDeltas?.deltaRelationships}
            />
            <StatSparkline
              label="Career"
              values={sparklineData.career}
              strokeColor="#f59e0b"
              fillColor="rgba(245, 158, 11, 0.08)"
              currentValue={latestStats.career}
              delta={currentStep?.statDeltas?.deltaCareer}
            />
          </div>

          {/* Net Worth Sparkline Banner */}
          <div className="mt-1">
            <StatSparkline
              label="Liquid Net Worth Progression"
              values={sparklineData.savings}
              strokeColor="#34d399"
              fillColor="rgba(52, 211, 153, 0.06)"
              currentValue={currentStep?.endingSavings ?? latestRecordedStep?.endingSavings ?? timeline.finalSavings ?? 0}
              delta={currentStep?.netWorthDelta}
              minVal={Math.min(0, ...sparklineData.savings)}
              maxVal={Math.max(10000, ...sparklineData.savings)}
              isCurrency={true}
            />
          </div>
        </div>

        {/* Chronological Quarter Selector Tabs */}
        <div className="px-4 sm:px-5 py-3 border-b border-zinc-850 bg-zinc-900/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Select Timeline Milestone
            </span>
            <span className="text-[11px] font-tabular text-zinc-400">
              Q{selectedQuarter} Selected
            </span>
          </div>

          {/* Scrollable quarter badges */}
          <div
            data-testid="quarter-selector-strip"
            className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-zinc-700"
          >
            {Array.from({ length: 20 }, (_, i) => i + 1).map((q) => {
              const step = sortedSteps.find((s) => s.quarter === q);
              const isSelected = selectedQuarter === q;
              const hasRecorded = !!step;

              let badgeColorClass = "border-zinc-800 text-zinc-400 bg-zinc-900";
              if (isSelected) {
                badgeColorClass = "border-sky-500 bg-sky-500/20 text-sky-300 font-bold";
              } else if (hasRecorded) {
                if (step.isBurnedOut) {
                  badgeColorClass = "border-zinc-700 text-zinc-400 bg-zinc-850";
                } else if (step.rolledEvent?.severity === "positive") {
                  badgeColorClass = "border-emerald-500/40 text-emerald-400 bg-emerald-500/10";
                } else if (step.rolledEvent?.severity === "negative") {
                  badgeColorClass = "border-rose-500/40 text-rose-400 bg-rose-500/10";
                } else {
                  badgeColorClass = "border-zinc-750 text-zinc-300 bg-zinc-850";
                }
              }

              return (
                <button
                  key={q}
                  type="button"
                  data-testid={`quarter-tab-${q}`}
                  onClick={() => handleQuarterClick(q)}
                  disabled={!hasRecorded && q > sortedSteps.length}
                  className={`px-2.5 py-1 rounded text-xs border font-tabular transition-colors whitespace-nowrap ${badgeColorClass} ${
                    !hasRecorded && q > sortedSteps.length ? "opacity-30 cursor-not-allowed" : "cursor-pointer hover:border-zinc-500"
                  }`}
                >
                  Q{q}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Quarter In-Depth Narrative & Story Log */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col gap-4">
          {currentStep ? (
            <div data-testid="selected-quarter-details" className="flex flex-col gap-4">
              {/* Quarter Milestone Banner */}
              <div className="flex items-center justify-between bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                <div>
                  <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                    Quarter Milestone
                  </div>
                  <div className="text-sm font-bold text-zinc-100 font-tabular">
                    Quarter {currentStep.quarter} • Month {currentStep.month} (Year{" "}
                    {Math.floor(currentStep.month / 12)} +{currentStep.month % 12}mo)
                  </div>
                </div>
                {eventSeverity && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${eventSeverity.textClass} ${eventSeverity.bgClass}`}
                  >
                    {eventSeverity.badgeLabel}
                  </span>
                )}
              </div>

              {/* Life Event Card */}
              {currentStep.rolledEvent && (
                <div className="p-3.5 rounded-lg bg-zinc-900 border border-zinc-800 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                      Quarterly External Shock / Event
                    </span>
                    <span className="text-[10px] text-zinc-400 capitalize">
                      {currentStep.rolledEvent.type}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-zinc-200">
                    {currentStep.rolledEvent.title}
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {currentStep.rolledEvent.description}
                  </p>
                </div>
              )}

              {/* Authentic First-Person Diary Narrative */}
              <div className="p-4 rounded-lg bg-zinc-900/80 border border-zinc-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                    First-Person Diary Log
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">Authentic Journal</span>
                </div>
                <blockquote
                  data-testid="drawer-diary-entry"
                  className="text-xs text-zinc-200 italic leading-relaxed pl-3 border-l-2 border-sky-500/50"
                >
                  &ldquo;{currentStep.diaryEntry}&rdquo;
                </blockquote>
              </div>

              {/* Counterfactual Reflection */}
              {currentStep.reflection && (
                <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-850 flex flex-col gap-1.5">
                  <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                    Counterfactual Divergence Reflection
                  </div>
                  <p
                    data-testid="drawer-reflection"
                    className="text-xs text-zinc-400 leading-relaxed"
                  >
                    {currentStep.reflection}
                  </p>
                </div>
              )}

              {/* Financial Snapshot Ledger */}
              <div className="p-3.5 rounded-lg bg-zinc-900 border border-zinc-800 flex flex-col gap-2">
                <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                  Zero-Token Financial Balance Ledger
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-tabular">
                  <div className="p-2 rounded bg-zinc-850 border border-zinc-750">
                    <span className="text-[10px] text-zinc-400 block">Monthly Income</span>
                    <span className="font-semibold text-zinc-200">
                      {formatCurrency(currentStep.monthlyIncome)}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-zinc-850 border border-zinc-750">
                    <span className="text-[10px] text-zinc-400 block">Monthly Burn</span>
                    <span className="font-semibold text-zinc-200">
                      {formatCurrency(currentStep.monthlyBurn)}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-zinc-850 border border-zinc-750">
                    <span className="text-[10px] text-zinc-400 block">Quarter Net Delta</span>
                    <span
                      className={`font-semibold ${
                        currentStep.netWorthDelta >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {currentStep.netWorthDelta >= 0 ? "+" : ""}
                      {formatCurrency(currentStep.netWorthDelta)}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-zinc-850 border border-zinc-750">
                    <span className="text-[10px] text-zinc-400 block">Ending Savings</span>
                    <span className="font-bold text-emerald-400">
                      {formatCurrency(currentStep.endingSavings)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              data-testid="empty-quarter-state"
              className="p-8 text-center rounded-lg border border-dashed border-zinc-800 text-zinc-400 text-xs flex flex-col items-center justify-center gap-2"
            >
              <span>No simulation step recorded for Quarter {selectedQuarter}.</span>
              <span className="text-[11px] text-zinc-400">
                Steps populate as the simulation engine processes quarters.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
