/**
 * Scene Compiler: Pure, Deterministic, Zero-Token Scene Line Generation
 * Compiles deterministic simulation events, finance calculations, and clamping outputs
 * into structured Scene Language lines.
 */

import {
  ParsedSceneLine,
  formatLine,
  sanitizeText,
} from "@/lib/scene/sceneLanguage";
import { LifeEvent, LifeEventType } from "@/lib/simulation/eventRoller";
import { LifeStats, LifeStatDeltas, TimelineHealthStatus } from "@/lib/simulation/statClamper";
import { resolveBranchColor } from "@/lib/simulation/branchColorEngine";

export type HitStat = "none" | "joy" | "hp" | "rel" | "car";

export type QuarterStageKind = "roll" | "calc" | "think" | "delta" | "clamp" | "say" | "done";

export interface QuarterStageContext {
  storyId: string;
  quarter: number;
  rolledEvent?: LifeEvent;
  finance?: {
    startingSavings: number;
    effectiveMonthlyIncome: number;
    monthlyBaseExpenses: number;
    netEventCashImpact: number;
    endingSavings: number;
  };
  provider?: string;
  rawDelta?: LifeStatDeltas;
  clampedStats?: LifeStats;
  isBurnout?: boolean;
  status?: TimelineHealthStatus;
  diaryText?: string;
  who?: string;
}

/**
 * Detects whether any clamped stat hit the boundary 0 or 100.
 * Priority order: joy, hp, rel, car. Returns "none" if none hit boundaries.
 */
export function detectHitStat(stats: LifeStats): HitStat {
  if (stats.happiness <= 0 || stats.happiness >= 100) return "joy";
  if (stats.health <= 0 || stats.health >= 100) return "hp";
  if (stats.relationships <= 0 || stats.relationships >= 100) return "rel";
  if (stats.career <= 0 || stats.career >= 100) return "car";
  return "none";
}

/**
 * Normalizes severity into 3-letter token: pos, neg, neu
 */
export function normalizeSeverity(severity: string): "pos" | "neg" | "neu" {
  if (severity === "positive" || severity === "pos") return "pos";
  if (severity === "negative" || severity === "neg") return "neg";
  return "neu";
}

export function compileBoot(
  sessionId: string,
  stories: number = 4,
  quarters: number = 20
): ParsedSceneLine<"BOOT"> {
  return {
    verb: "BOOT",
    scope: { kind: "global", raw: "@*" },
    args: {
      sess: sanitizeText(sessionId, 32),
      stories,
      quarters,
    },
  };
}

export function compileFork(
  storyId: string,
  opt: "A" | "B",
  seed: string,
  label: string,
  loc: string
): ParsedSceneLine<"FORK"> {
  return {
    verb: "FORK",
    scope: { kind: "story", raw: `@${storyId}`, storyId },
    args: {
      opt,
      seed: sanitizeText(seed, 24),
      label: sanitizeText(label, 64),
      loc: sanitizeText(loc, 64),
    },
  };
}

export function compileCast(
  role: string,
  name: string,
  trait: string
): ParsedSceneLine<"CAST"> {
  return {
    verb: "CAST",
    scope: { kind: "global", raw: "@*" },
    args: {
      role: sanitizeText(role, 24),
      name: sanitizeText(name, 32),
      trait: sanitizeText(trait, 32),
    },
  };
}

export function compileRoll(
  storyId: string,
  quarter: number,
  event: LifeEvent
): ParsedSceneLine<"ROLL"> {
  return {
    verb: "ROLL",
    scope: {
      kind: "quarter",
      raw: `@${storyId}/Q${quarter}`,
      storyId,
      quarter,
    },
    args: {
      ev: event.type as LifeEventType,
      sev: normalizeSeverity(event.severity),
      title: sanitizeText(event.title, 64),
    },
  };
}

export function compileCalc(
  storyId: string,
  quarter: number,
  cash0: number,
  inc: number,
  exp: number,
  evc: number,
  cash1: number
): ParsedSceneLine<"CALC"> {
  return {
    verb: "CALC",
    scope: {
      kind: "quarter",
      raw: `@${storyId}/Q${quarter}`,
      storyId,
      quarter,
    },
    args: {
      cash0: Math.round(cash0),
      inc: Math.round(inc),
      exp: Math.round(exp),
      evc: Math.round(evc),
      cash1: Math.round(cash1),
    },
  };
}

export function compileThink(
  storyId: string,
  quarter: number,
  prov: string
): ParsedSceneLine<"THINK"> {
  return {
    verb: "THINK",
    scope: {
      kind: "quarter",
      raw: `@${storyId}/Q${quarter}`,
      storyId,
      quarter,
    },
    args: {
      prov: sanitizeText(prov, 24),
    },
  };
}

export function compileDelta(
  storyId: string,
  quarter: number,
  delta: LifeStatDeltas
): ParsedSceneLine<"DELTA"> {
  return {
    verb: "DELTA",
    scope: {
      kind: "quarter",
      raw: `@${storyId}/Q${quarter}`,
      storyId,
      quarter,
    },
    args: {
      joy: Math.round(delta.deltaHappiness || 0),
      hp: Math.round(delta.deltaHealth || 0),
      rel: Math.round(delta.deltaRelationships || 0),
      car: Math.round(delta.deltaCareer || 0),
    },
  };
}

export function compileClamp(
  storyId: string,
  quarter: number,
  stats: LifeStats,
  hitOverride?: HitStat
): ParsedSceneLine<"CLAMP"> {
  const hit = hitOverride ?? detectHitStat(stats);
  return {
    verb: "CLAMP",
    scope: {
      kind: "quarter",
      raw: `@${storyId}/Q${quarter}`,
      storyId,
      quarter,
    },
    args: {
      joy: Math.round(stats.happiness),
      hp: Math.round(stats.health),
      rel: Math.round(stats.relationships),
      car: Math.round(stats.career),
      hit,
    },
  };
}

export function compileStatus(
  storyId: string,
  quarter: number,
  stats: LifeStats,
  isBurnout: boolean = false
): ParsedSceneLine<"STATUS"> {
  const branchColor = resolveBranchColor(stats, isBurnout);
  return {
    verb: "STATUS",
    scope: {
      kind: "quarter",
      raw: `@${storyId}/Q${quarter}`,
      storyId,
      quarter,
    },
    args: {
      st: branchColor.status,
      burn: isBurnout ? 1 : 0,
    },
  };
}

export function compileSay(
  storyId: string,
  quarter: number,
  who: string,
  text: string
): ParsedSceneLine<"SAY"> {
  return {
    verb: "SAY",
    scope: {
      kind: "quarter",
      raw: `@${storyId}/Q${quarter}`,
      storyId,
      quarter,
    },
    args: {
      who: sanitizeText(who, 24),
      text: sanitizeText(text, 220),
    },
  };
}

export function compileDone(
  storyId: string,
  quarter: number
): ParsedSceneLine<"DONE"> {
  return {
    verb: "DONE",
    scope: {
      kind: "quarter",
      raw: `@${storyId}/Q${quarter}`,
      storyId,
      quarter,
    },
    args: {},
  };
}

export function compileEnd(
  storyId: string,
  cash: number,
  st: string
): ParsedSceneLine<"END"> {
  return {
    verb: "END",
    scope: { kind: "story", raw: `@${storyId}`, storyId },
    args: {
      cash: Math.round(cash),
      st: sanitizeText(st, 24),
    },
  };
}

export function compileProgress(
  done: number,
  total: number
): ParsedSceneLine<"PROGRESS"> {
  return {
    verb: "PROGRESS",
    scope: { kind: "global", raw: "@*" },
    args: {
      done: Math.round(done),
      total: Math.round(total),
    },
  };
}

export function compileReroute(
  from: string,
  to: string
): ParsedSceneLine<"REROUTE"> {
  return {
    verb: "REROUTE",
    scope: { kind: "global", raw: "@*" },
    args: {
      from: sanitizeText(from, 24),
      to: sanitizeText(to, 24),
    },
  };
}

export function compileError(
  storyId: string,
  quarter: number,
  code: string
): ParsedSceneLine<"ERROR"> {
  return {
    verb: "ERROR",
    scope: {
      kind: "quarter",
      raw: `@${storyId}/Q${quarter}`,
      storyId,
      quarter,
    },
    args: {
      code: sanitizeText(code, 32),
    },
  };
}

export function compileNarrate(
  phase: "digest" | "gemini" | "report" | "done"
): ParsedSceneLine<"NARRATE"> {
  return {
    verb: "NARRATE",
    scope: { kind: "global", raw: "@*" },
    args: { phase },
  };
}

export function compileFinish(): ParsedSceneLine<"FINISH"> {
  return {
    verb: "FINISH",
    scope: { kind: "global", raw: "@*" },
    args: {},
  };
}

/**
 * Compiles a specific simulation stage into one or more parsed Scene lines.
 */
export function compileQuarterStage(
  stage: QuarterStageKind,
  ctx: QuarterStageContext
): ParsedSceneLine[] {
  const { storyId, quarter } = ctx;

  switch (stage) {
    case "roll": {
      if (!ctx.rolledEvent) return [];
      return [compileRoll(storyId, quarter, ctx.rolledEvent)];
    }
    case "calc": {
      if (!ctx.finance) return [];
      return [
        compileCalc(
          storyId,
          quarter,
          ctx.finance.startingSavings,
          ctx.finance.effectiveMonthlyIncome,
          ctx.finance.monthlyBaseExpenses,
          ctx.finance.netEventCashImpact,
          ctx.finance.endingSavings
        ),
      ];
    }
    case "think": {
      return [compileThink(storyId, quarter, ctx.provider || "groq")];
    }
    case "delta": {
      return [compileDelta(storyId, quarter, ctx.rawDelta || {})];
    }
    case "clamp": {
      if (!ctx.clampedStats) return [];
      const clampLine = compileClamp(storyId, quarter, ctx.clampedStats);
      const statusLine = compileStatus(
        storyId,
        quarter,
        ctx.clampedStats,
        ctx.isBurnout || false
      );
      return [clampLine, statusLine];
    }
    case "say": {
      const sayLine = compileSay(
        storyId,
        quarter,
        ctx.who || "you",
        ctx.diaryText || "Quarter complete."
      );
      const doneLine = compileDone(storyId, quarter);
      return [sayLine, doneLine];
    }
    case "done": {
      return [compileDone(storyId, quarter)];
    }
    default:
      return [];
  }
}

/**
 * Compiles a stage directly to formatted string lines.
 */
export function compileQuarterStageToLines(
  stage: QuarterStageKind,
  ctx: QuarterStageContext
): string[] {
  return compileQuarterStage(stage, ctx).map(formatLine);
}
