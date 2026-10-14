import React from "react";

export interface HudMetricCardProps {
  label: string;
  value: string | number;
  delta?: number;
  deltaSuffix?: string;
  unit?: string;
  status?: "thriving" | "plateau" | "struggling" | "neutral";
  caption?: string;
  className?: string;
}

export function HudMetricCard({
  label,
  value,
  delta,
  deltaSuffix = "",
  unit,
  status = "neutral",
  caption,
  className = "",
}: HudMetricCardProps) {
  const getStatusBorder = () => {
    switch (status) {
      case "thriving":
        return "border-emerald-500/20";
      case "plateau":
        return "border-amber-500/20";
      case "struggling":
        return "border-rose-500/20";
      default:
        return "border-zinc-800";
    }
  };

  const renderDelta = () => {
    if (delta === undefined || delta === null) return null;
    const isPositive = delta > 0;
    const isNegative = delta < 0;
    const isZero = delta === 0;

    let colorClass = "text-zinc-400 bg-zinc-800/40 border-zinc-700/50";
    let sign = "";

    if (isPositive) {
      colorClass = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      sign = "+";
    } else if (isNegative) {
      colorClass = "text-rose-400 bg-rose-500/10 border-rose-500/20";
    }

    return (
      <span
        data-testid="metric-delta"
        className={`inline-flex items-center text-[11px] font-semibold font-tabular px-1.5 py-0.5 rounded border ${colorClass}`}
      >
        {isPositive && "▲ "}
        {isNegative && "▼ "}
        {isZero && "• "}
        {sign}
        {delta}
        {deltaSuffix}
      </span>
    );
  };

  return (
    <div
      data-testid="hud-metric-card"
      className={`bg-[#121215] border ${getStatusBorder()} rounded-lg p-3.5 flex flex-col justify-between transition-colors ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 truncate">
          {label}
        </span>
        {renderDelta()}
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-xl md:text-2xl font-bold font-tabular text-zinc-100 tracking-tight">
          {value}
        </span>
        {unit && <span className="text-xs text-zinc-400 font-medium">{unit}</span>}
      </div>

      {caption && (
        <span className="text-[10px] text-zinc-400 mt-1 truncate">
          {caption}
        </span>
      )}
    </div>
  );
}
