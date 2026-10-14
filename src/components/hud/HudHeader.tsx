import React from "react";

export interface HudHeaderProps {
  decisionPrompt?: string;
  optionAName?: string;
  optionBName?: string;
  status?: "idle" | "running" | "completed" | "error";
  currentMonth?: number; // 0 to 60
  totalTimelines?: number;
  className?: string;
}

export function HudHeader({
  decisionPrompt = "Exploring parallel life trajectories",
  optionAName = "Option A",
  optionBName = "Option B",
  status = "idle",
  currentMonth = 0,
  totalTimelines = 12,
  className = "",
}: HudHeaderProps) {
  const getStatusBadge = () => {
    switch (status) {
      case "running":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            SIMULATING (MONTH {currentMonth}/60)
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zinc-800 border border-zinc-700 text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            SIMULATION COMPLETE
          </span>
        );
      case "error":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 border border-rose-500/25 text-rose-400">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            STREAM INTERRUPTED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zinc-900 border border-zinc-800 text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
            STANDBY • {totalTimelines} BRANCHES
          </span>
        );
    }
  };

  return (
    <header
      data-testid="hud-header"
      className={`bg-[#09090b] border-b border-zinc-800/80 px-4 py-3 md:px-6 md:py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 ${className}`}
    >
      {/* Brand & Mandatory Framing Notice */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-base md:text-lg font-bold tracking-tight text-zinc-100 uppercase">
            Multiverse You
          </span>
          <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-zinc-800/60 border border-zinc-700/60 text-zinc-400">
            Counterfactual Engine
          </span>
        </div>

        {/* Anti-AI-Slop Framing Invariant */}
        <p
          data-testid="hud-framing-notice"
          className="text-[11px] font-medium text-zinc-400 tracking-wide"
        >
          Reflective Simulation Engine • Not a Future Prediction
        </p>
      </div>

      {/* Dilemma Summary & Status */}
      <div className="flex items-center gap-4 flex-wrap md:justify-end">
        <div className="hidden lg:flex flex-col text-right">
          <span className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">
            Active Dilemma
          </span>
          <span
            title={decisionPrompt}
            className="text-xs font-medium text-zinc-300 max-w-md truncate"
          >
            {optionAName} vs {optionBName}
          </span>
        </div>

        {getStatusBadge()}
      </div>
    </header>
  );
}
