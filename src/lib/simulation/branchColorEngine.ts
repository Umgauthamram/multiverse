import {
  LifeStats,
  TimelineHealthStatus,
  applyAndClampStats,
} from "@/lib/simulation/statClamper";
import { STATUS_COLORS } from "@/components/tree/MultiverseTreeCanvas";

export interface BranchColorConfig {
  status: TimelineHealthStatus;
  hexColor: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  glowColor: string;
  label: string;
}

export const BRANCH_COLOR_MAP: Record<TimelineHealthStatus, BranchColorConfig> = {
  thriving: {
    status: "thriving",
    hexColor: STATUS_COLORS.thriving,
    bgClass: "bg-emerald-500/10",
    textClass: "text-emerald-400",
    borderClass: "border-emerald-500/25",
    glowColor: "rgba(16, 185, 129, 0.35)",
    label: "Thriving",
  },
  plateau: {
    status: "plateau",
    hexColor: STATUS_COLORS.plateau,
    bgClass: "bg-amber-500/10",
    textClass: "text-amber-400",
    borderClass: "border-amber-500/25",
    glowColor: "rgba(245, 158, 11, 0.35)",
    label: "Plateau",
  },
  struggling: {
    status: "struggling",
    hexColor: STATUS_COLORS.struggling,
    bgClass: "bg-rose-500/10",
    textClass: "text-rose-400",
    borderClass: "border-rose-500/25",
    glowColor: "rgba(239, 68, 68, 0.35)",
    label: "Struggling",
  },
  burnout: {
    status: "burnout",
    hexColor: STATUS_COLORS.burnout,
    bgClass: "bg-zinc-800/60",
    textClass: "text-zinc-400",
    borderClass: "border-zinc-700",
    glowColor: "rgba(113, 113, 122, 0.25)",
    label: "Terminated / Burnout",
  },
};

/**
 * Determines branch color configuration and health status from life stats.
 */
export function resolveBranchColor(
  stats: LifeStats,
  isBurnoutOverride: boolean = false
): BranchColorConfig {
  if (isBurnoutOverride) {
    return BRANCH_COLOR_MAP.burnout;
  }

  const evaluation = applyAndClampStats(stats, {});
  return BRANCH_COLOR_MAP[evaluation.status];
}

/**
 * Resolves styling attributes for rolled unexpected event badges.
 */
export function resolveEventSeverityStyle(
  severity: "positive" | "negative" | "neutral"
): {
  badgeLabel: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
} {
  switch (severity) {
    case "positive":
      return {
        badgeLabel: "OPPORTUNITY",
        bgClass: "bg-emerald-500/10",
        textClass: "text-emerald-400",
        borderClass: "border-emerald-500/20",
      };
    case "negative":
      return {
        badgeLabel: "CRISIS / SHOCK",
        bgClass: "bg-rose-500/10",
        textClass: "text-rose-400",
        borderClass: "border-rose-500/20",
      };
    default:
      return {
        badgeLabel: "STEADY STATE",
        bgClass: "bg-zinc-800/50",
        textClass: "text-zinc-400",
        borderClass: "border-zinc-700/60",
      };
  }
}

/**
 * Analyzes multi-quarter stat trajectories to detect trajectory momentum.
 */
export function calculateHealthTrajectory(
  statsHistory: LifeStats[]
): {
  currentStatus: TimelineHealthStatus;
  trend: "improving" | "declining" | "stable";
  scoreDelta: number;
} {
  if (statsHistory.length === 0) {
    return { currentStatus: "plateau", trend: "stable", scoreDelta: 0 };
  }

  const latestStats = statsHistory[statsHistory.length - 1];
  const colorConfig = resolveBranchColor(latestStats);

  if (statsHistory.length === 1) {
    return {
      currentStatus: colorConfig.status,
      trend: "stable",
      scoreDelta: 0,
    };
  }

  const prevStats = statsHistory[statsHistory.length - 2];
  const currentAvg =
    (latestStats.happiness +
      latestStats.health +
      latestStats.relationships +
      latestStats.career) /
    4;
  const prevAvg =
    (prevStats.happiness +
      prevStats.health +
      prevStats.relationships +
      prevStats.career) /
    4;

  const scoreDelta = Math.round(currentAvg - prevAvg);

  let trend: "improving" | "declining" | "stable" = "stable";
  if (scoreDelta >= 3) {
    trend = "improving";
  } else if (scoreDelta <= -3) {
    trend = "declining";
  }

  return {
    currentStatus: colorConfig.status,
    trend,
    scoreDelta,
  };
}
