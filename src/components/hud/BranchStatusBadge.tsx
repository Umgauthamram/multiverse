import React from "react";
import { TimelineHealthStatus } from "@/lib/simulation/statClamper";

export interface BranchStatusBadgeProps {
  status: TimelineHealthStatus | "active" | "completed";
  label?: string;
  className?: string;
}

const STATUS_CONFIG: Record<
  TimelineHealthStatus | "active" | "completed",
  { text: string; bg: string; textClass: string; dotClass: string }
> = {
  thriving: {
    text: "THRIVING",
    bg: "bg-emerald-500/10 border-emerald-500/25",
    textClass: "text-emerald-400",
    dotClass: "bg-emerald-500",
  },
  plateau: {
    text: "PLATEAU",
    bg: "bg-amber-500/10 border-amber-500/25",
    textClass: "text-amber-400",
    dotClass: "bg-amber-500",
  },
  struggling: {
    text: "STRUGGLING",
    bg: "bg-rose-500/10 border-rose-500/25",
    textClass: "text-rose-400",
    dotClass: "bg-rose-500",
  },
  burnout: {
    text: "BURNOUT",
    bg: "bg-zinc-800/60 border-zinc-700",
    textClass: "text-zinc-400",
    dotClass: "bg-zinc-500",
  },
  active: {
    text: "ACTIVE",
    bg: "bg-zinc-800/40 border-zinc-700/60",
    textClass: "text-zinc-300",
    dotClass: "bg-zinc-400",
  },
  completed: {
    text: "COMPLETED",
    bg: "bg-zinc-900 border-zinc-700",
    textClass: "text-zinc-200",
    dotClass: "bg-zinc-300",
  },
};

export function BranchStatusBadge({
  status,
  label,
  className = "",
}: BranchStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.active;
  const displayLabel = label || config.text;

  return (
    <span
      data-testid="branch-status-badge"
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase border ${config.bg} ${config.textClass} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
      <span>{displayLabel}</span>
    </span>
  );
}
