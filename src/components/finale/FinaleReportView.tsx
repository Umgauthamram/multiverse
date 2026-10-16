"use client";

import React, { useState, useMemo } from "react";
import { FinaleReport, RankedFuture, PivotalDivergence, RegretHotspot } from "@/lib/ai/agents/narratorAgent";

export interface HeatmapCellData {
  month: number;
  quarter: number;
  timelineId: string;
  timelineLabel?: string;
  path: "A" | "B";
  personaSeed: string;
  happiness: number;
  happinessDelta: number;
  isBurnedOut: boolean;
  eventTitle?: string;
  eventSeverity?: "positive" | "negative" | "neutral";
  endingSavings?: number;
}

export interface FinaleTimelineInput {
  timelineId: string;
  branchOption: "A" | "B";
  branchName: string;
  branchLocation: string;
  personaSeed: string;
  finalStats?: { happiness: number; health: number; relationships: number; career: number };
  finalSavings?: number;
}

export interface FinaleStepInput {
  timelineId: string;
  quarter: number;
  month: number;
  stats: { happiness: number; health: number; relationships: number; career: number };
  statDeltas?: { deltaHappiness?: number };
  isBurnedOut?: boolean;
  rolledEvent?: { title: string; severity: "positive" | "negative" | "neutral" };
  endingSavings?: number;
}

export interface FinaleReportViewProps {
  report: FinaleReport;
  decisionPrompt: string;
  optionA: { name: string; location: string };
  optionB: { name: string; location: string };
  timelines?: FinaleTimelineInput[];
  steps?: FinaleStepInput[];
  onRestart?: () => void;
  onExploreTree?: () => void;
  className?: string;
}

/**
 * Returns background and border styling for a Regret Heatmap cell based on stress/happiness.
 */
export function getHeatmapCellColor(cell: HeatmapCellData | undefined): {
  bg: string;
  border: string;
  text: string;
} {
  if (!cell) {
    return {
      bg: "bg-zinc-900/40",
      border: "border-zinc-850",
      text: "text-zinc-400",
    };
  }

  if (cell.isBurnedOut) {
    return {
      bg: "bg-zinc-950",
      border: "border-rose-900/80 ring-1 ring-rose-900/40",
      text: "text-rose-400 font-bold",
    };
  }

  // Severe drop or low absolute happiness (regret hotspot)
  if (cell.happiness < 40 || cell.happinessDelta <= -10) {
    return {
      bg: "bg-rose-950/70",
      border: "border-rose-700/60",
      text: "text-rose-300 font-semibold",
    };
  }

  // Mild stress or negative trajectory
  if (cell.happiness < 55 || cell.happinessDelta < 0) {
    return {
      bg: "bg-amber-950/50",
      border: "border-amber-800/40",
      text: "text-amber-300",
    };
  }

  // High flourishing / thriving
  if (cell.happiness >= 75) {
    return {
      bg: "bg-emerald-950/70",
      border: "border-emerald-700/60",
      text: "text-emerald-300 font-semibold",
    };
  }

  // Steady baseline
  return {
    bg: "bg-zinc-900",
    border: "border-zinc-800",
    text: "text-zinc-300",
  };
}

/**
 * Maps category to appropriate functional badge styling.
 */
export function getRegretCategoryStyle(category: string): { label: string; textClass: string; bgClass: string } {
  switch (category) {
    case "health":
      return { label: "HEALTH & VITALITY", textClass: "text-rose-400", bgClass: "bg-rose-500/10 border-rose-500/25" };
    case "relationships":
      return { label: "SOCIAL & ROOTS", textClass: "text-purple-400", bgClass: "bg-purple-500/10 border-purple-500/25" };
    case "finances":
      return { label: "FINANCIAL RESERVES", textClass: "text-amber-400", bgClass: "bg-amber-500/10 border-amber-500/25" };
    case "career":
      return { label: "CAREER RESTLESSNESS", textClass: "text-sky-400", bgClass: "bg-sky-500/10 border-sky-500/25" };
    default:
      return { label: category.toUpperCase(), textClass: "text-zinc-300", bgClass: "bg-zinc-800 border-zinc-700" };
  }
}

export function FinaleReportView({
  report,
  decisionPrompt,
  optionA,
  optionB,
  timelines = [],
  steps = [],
  onRestart,
  onExploreTree,
  className = "",
}: FinaleReportViewProps) {
  const [selectedCell, setSelectedCell] = useState<HeatmapCellData | null>(null);

  // Build cell lookup: key = `${timelineId}-Q${quarter}`
  const heatmapLookup = useMemo(() => {
    const map = new Map<string, HeatmapCellData>();

    steps.forEach((step) => {
      const tl = timelines.find((t) => t.timelineId === step.timelineId);
      const cell: HeatmapCellData = {
        month: step.month,
        quarter: step.quarter,
        timelineId: step.timelineId,
        timelineLabel: tl ? `${tl.branchName} (${tl.personaSeed})` : step.timelineId,
        path: tl ? tl.branchOption : "A",
        personaSeed: tl ? tl.personaSeed : "standard",
        happiness: step.stats.happiness,
        happinessDelta: step.statDeltas?.deltaHappiness ?? 0,
        isBurnedOut: !!step.isBurnedOut,
        eventTitle: step.rolledEvent?.title,
        eventSeverity: step.rolledEvent?.severity,
        endingSavings: step.endingSavings,
      };
      map.set(`${step.timelineId}-Q${step.quarter}`, cell);
    });

    return map;
  }, [steps, timelines]);

  // Quarters 1 through 20 (Months 3 to 60)
  const quarters = useMemo(() => Array.from({ length: 20 }, (_, i) => i + 1), []);

  return (
    <div
      data-testid="finale-report-view"
      className={`w-full max-w-6xl mx-auto flex flex-col gap-8 text-zinc-100 select-none pb-16 ${className}`}
    >
      {/* 1. Header Banner & Mandatory Anti-AI-Slop Notice */}
      <div className="flex flex-col gap-3 p-6 rounded-xl bg-zinc-900/60 border border-zinc-800">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-[11px] font-bold px-3 py-1 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 uppercase tracking-widest font-mono">
            {report.synthesisDisclaimer}
          </span>
          <div className="flex items-center gap-2">
            {onExploreTree && (
              <button
                type="button"
                onClick={onExploreTree}
                data-testid="btn-explore-tree"
                className="px-3 py-1.5 rounded text-xs font-semibold bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700 transition-colors"
              >
                ◀ Return to Tree Canvas
              </button>
            )}
            {onRestart && (
              <button
                type="button"
                onClick={onRestart}
                data-testid="btn-restart-sim"
                className="px-3 py-1.5 rounded text-xs font-semibold bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 transition-colors"
              >
                New Simulation
              </button>
            )}
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-100">
          5-Year Counterfactual Synthesis
        </h1>
        <p className="text-sm text-zinc-400 max-w-3xl leading-relaxed">
          Comprehensive comparative analysis evaluating 12 simulated branches across 20 quarters. Grounded strictly in
          mathematical compounding, statistical invariants, and authentic psychological journal reflections.
        </p>

        {/* User Dilemma Summary Strip */}
        <div className="mt-2 p-3.5 rounded-lg bg-zinc-950/80 border border-zinc-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Core Decision Dilemma</span>
            <span className="font-semibold text-zinc-200">&ldquo;{decisionPrompt}&rdquo;</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2.5 py-1 rounded bg-sky-500/10 border border-sky-500/25 text-sky-400 font-bold">
              Path A: {optionA.name}
            </span>
            <span className="text-zinc-400 font-bold">vs</span>
            <span className="px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/25 text-amber-400 font-bold">
              Path B: {optionB.name}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Executive Reflection & Comparative Path Summaries */}
      <div className="flex flex-col gap-4">
        <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Executive Comparative Reflection
            </h2>
            <span className="text-[11px] font-mono text-zinc-400">Gemini 2.5 Flash Holistic Synthesis</span>
          </div>
          <p
            data-testid="executive-reflection-text"
            className="text-sm sm:text-base text-zinc-200 leading-relaxed border-l-2 border-sky-500 pl-4 py-1"
          >
            {report.executiveReflection}
          </p>
        </div>

        {/* Path A vs Path B Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <h3 className="text-sm font-bold text-sky-300">Path A: {optionA.name} ({optionA.location})</h3>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {report.pathAOverallSummary}
            </p>
          </div>

          <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <h3 className="text-sm font-bold text-amber-300">Path B: {optionB.name} ({optionB.location})</h3>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {report.pathBOverallSummary}
            </p>
          </div>
        </div>
      </div>

      {/* 3. The Interactive Regret Heatmap Matrix */}
      <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
              Interactive Regret Heatmap Matrix
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Emotional stress and happiness trajectory across 20 quarters. Click any cell to inspect milestones.
            </p>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase text-zinc-400 flex-wrap">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-950 border border-emerald-700/60" /> Flourishing (75+)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-zinc-900 border border-zinc-800" /> Steady (55-74)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-950 border border-amber-800/40" /> Mild Strain (40-54)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-rose-950 border border-rose-700/60" /> Crisis (&lt;40)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-zinc-950 border border-rose-900" /> Burnout
            </span>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-700">
          <div className="min-w-[760px] flex flex-col gap-1.5">
            {/* Quarter Header Row */}
            <div className="flex items-center text-[10px] font-bold text-zinc-400 font-tabular pl-36">
              {quarters.map((q) => (
                <div key={q} className="flex-1 text-center">
                  Q{q}
                </div>
              ))}
            </div>

            {/* Matrix Rows: 1 per Timeline */}
            {timelines.map((tl, rowIdx) => {
              return (
                <div key={tl.timelineId} className="flex items-center gap-1.5">
                  {/* Row Label */}
                  <div className="w-34 truncate text-[11px] font-semibold flex items-center gap-1.5 text-zinc-300">
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                        tl.branchOption === "A"
                          ? "bg-sky-500/15 text-sky-400"
                          : "bg-amber-500/15 text-amber-400"
                      }`}
                    >
                      T{rowIdx + 1}
                    </span>
                    <span className="truncate capitalize">{tl.personaSeed}</span>
                  </div>

                  {/* 20 Quarter Cells */}
                  <div className="flex-1 flex items-center gap-1">
                    {quarters.map((q) => {
                      const cell = heatmapLookup.get(`${tl.timelineId}-Q${q}`);
                      const style = getHeatmapCellColor(cell);
                      const isSelected =
                        selectedCell?.timelineId === tl.timelineId && selectedCell?.quarter === q;

                      return (
                        <button
                          key={q}
                          type="button"
                          data-testid={`heatmap-cell-${tl.timelineId}-Q${q}`}
                          onClick={() => cell && setSelectedCell(cell)}
                          disabled={!cell}
                          className={`flex-1 h-6 rounded-xs border text-[10px] font-tabular transition-transform flex items-center justify-center ${style.bg} ${style.border} ${style.text} ${
                            isSelected ? "ring-2 ring-sky-400 scale-105 z-10" : "hover:scale-105"
                          }`}
                        >
                          {cell ? cell.happiness : "-"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Cell Detail Banner */}
        {selectedCell && (
          <div
            data-testid="heatmap-selected-cell-detail"
            className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
          >
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-zinc-200">
                  {selectedCell.timelineLabel} • Q{selectedCell.quarter} (Month {selectedCell.month})
                </span>
                {selectedCell.isBurnedOut && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    BURNOUT SHOCK
                  </span>
                )}
              </div>
              <span className="text-zinc-400">
                Happiness: {selectedCell.happiness}/100 ({selectedCell.happinessDelta >= 0 ? "+" : ""}
                {selectedCell.happinessDelta})
                {selectedCell.eventTitle && ` • Event: "${selectedCell.eventTitle}"`}
              </span>
            </div>

            {selectedCell.endingSavings !== undefined && (
              <span className="text-xs font-tabular font-bold text-emerald-400 bg-zinc-900 px-3 py-1.5 rounded border border-zinc-800">
                Savings: ${selectedCell.endingSavings.toLocaleString()}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 4. Ranked Futures Showcase (1 to 12) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
            Ranked Futures Matrix (Overall Composite Balance)
          </h2>
          <span className="text-[11px] font-mono text-zinc-400">12 Parallel Outcomes Evaluated</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {report.rankedFutures.map((future: RankedFuture) => {
            const isTop3 = future.rank <= 3;
            return (
              <div
                key={`${future.timelineId}-${future.rank}`}
                data-testid={`ranked-future-card-${future.rank}`}
                className={`p-4 rounded-xl border flex flex-col justify-between gap-3 bg-zinc-900 transition-colors ${
                  isTop3 ? "border-zinc-700 bg-zinc-900/90" : "border-zinc-850 bg-zinc-900/40"
                }`}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold font-tabular px-2 py-0.5 rounded ${
                          isTop3
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-zinc-800 text-zinc-400 border border-zinc-750"
                        }`}
                      >
                        #{future.rank}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          future.path === "A"
                            ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        Path {future.path}
                      </span>
                      <span className="text-[10px] font-semibold text-zinc-400 capitalize">
                        {future.personaSeed}
                      </span>
                    </div>

                    <span className="text-xs font-tabular font-bold text-zinc-300">
                      Score: {future.score}/100
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-zinc-100 leading-snug">
                    {future.headline}
                  </h3>
                </div>

                <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-850 text-xs">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-0.5">
                    Core Tradeoff & Sacrifice
                  </span>
                  <p className="text-zinc-300 leading-relaxed text-[11px]">
                    {future.tradeoffSummary}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. The 3 Pivotal Divergence Moments */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
            The Critical Divergence Moments
          </h2>
          <span className="text-[11px] font-mono text-zinc-400">Irreversible Path Split Points</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {report.pivotalDivergences.map((pivotal: PivotalDivergence, idx: number) => (
            <div
              key={idx}
              data-testid={`pivotal-divergence-card-${idx}`}
              className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between gap-3"
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-zinc-800 text-sky-400 border border-zinc-700">
                    Month {pivotal.month} (Q{Math.ceil(pivotal.month / 3)})
                  </span>
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Divergence #{idx + 1}</span>
                </div>
                <h3 className="text-sm font-bold text-zinc-100 mt-1">
                  {pivotal.title}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {pivotal.description}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-850 text-xs flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold text-zinc-400">
                  Counterfactual Contrast
                </span>
                <p className="text-zinc-300 text-[11px] leading-relaxed">
                  {pivotal.counterfactualComparison}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Systemic Regret Hotspots & Actionable Psychological Mitigations */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
            Systemic Regret Hotspots & Real-World Mitigations
          </h2>
          <span className="text-[11px] font-mono text-zinc-400">Actionable Reflection Points</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {report.regretHotspots.map((hotspot: RegretHotspot, idx: number) => {
            const style = getRegretCategoryStyle(hotspot.category);
            return (
              <div
                key={idx}
                data-testid={`regret-hotspot-card-${idx}`}
                className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between gap-3"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${style.textClass} ${style.bgClass}`}
                    >
                      {style.label}
                    </span>
                    <span className="text-[10px] uppercase font-mono text-zinc-400">
                      Severity: {hotspot.severity}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                    {hotspot.insight}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-850 text-xs flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-400">
                    Real-World Preventive Mitigation
                  </span>
                  <p className="text-zinc-300 text-[11px] leading-relaxed">
                    {hotspot.mitigationAdvice}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
