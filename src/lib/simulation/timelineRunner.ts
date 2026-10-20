import { Db } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import {
  LifeStats,
  LifeStatDeltas,
  TimelineHealthStatus,
  applyAndClampStats,
} from "@/lib/simulation/statClamper";
import { calculateQuarterFinance } from "@/lib/simulation/financeEngine";
import { rollQuarterEvent, LifeEvent } from "@/lib/simulation/eventRoller";
import {
  PersonaSeedType,
  PERSONA_PROFILES,
} from "@/lib/simulation/personaSeeder";
import {
  simulateQuarterStep,
  QuarterDelta,
} from "@/lib/ai/agents/lifeAgent";
import { ObjectExecutor, ProviderCandidate } from "@/lib/ai/router";

/**
 * Record representing the completed simulation of a single 3-month quarter.
 */
export interface TimelineQuarterRecord {
  sessionId: string;
  timelineId: string;
  branchOption: "A" | "B";
  branchName: string;
  branchLocation: string;
  personaSeed: PersonaSeedType;
  quarter: number; // 1 to 20
  month: number; // 3 to 60
  startingSavings: number;
  endingSavings: number;
  netWorthDelta: number;
  monthlyIncome: number;
  monthlyBurn: number;
  stats: LifeStats;
  statDeltas: {
    deltaHappiness: number;
    deltaHealth: number;
    deltaRelationships: number;
    deltaCareer: number;
  };
  rolledEvent: LifeEvent;
  diaryEntry: string;
  reflection: string;
  isBurnedOut: boolean;
  status: "active" | "burned_out" | "completed";
  recordedAt: Date;
}

/**
 * Summary record of a finished timeline across all simulated quarters.
 */
export interface TimelineSummary {
  sessionId: string;
  timelineId: string;
  branchOption: "A" | "B";
  branchName: string;
  branchLocation: string;
  personaSeed: PersonaSeedType;
  totalQuartersCompleted: number;
  finalStats: LifeStats;
  finalSavings: number;
  isBurnedOut: boolean;
  steps: TimelineQuarterRecord[];
  lowestHappinessQuarter?: number;
  peakCareerQuarter?: number;
}

import { detectHitStat, HitStat } from "@/lib/scene/sceneCompiler";

export type QuarterStage =
  | { stage: "roll"; event: LifeEvent }
  | {
      stage: "calc";
      cash0: number;
      inc: number;
      exp: number;
      evc: number;
      cash1: number;
    }
  | { stage: "think"; provider: string }
  | { stage: "delta"; rawDelta: LifeStatDeltas }
  | { stage: "clamp"; stats: LifeStats; hit: HitStat }
  | { stage: "status"; status: TimelineHealthStatus; burn: number }
  | { stage: "say"; text: string }
  | { stage: "done" };

export interface QuarterStepConfig {
  sessionId: string;
  timelineId: string;
  branchOption: "A" | "B";
  branchName: string;
  branchLocation: string;
  personaSeed: PersonaSeedType;
  decisionPrompt: string;
  quarter: number;
  currentStats: LifeStats;
  currentSavings: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  costOfLivingIndex?: number;
  persistToDb?: boolean;
  db?: Db;
  collectionName?: string;
  customChain?: ProviderCandidate[];
  executor?: ObjectExecutor<QuarterDelta>;
  onStage?: (stage: QuarterStage) => void | Promise<void>;
  onFallback?: (from: string, to: string) => void | Promise<void>;
}

export interface TimelineRunConfig {
  sessionId: string;
  timelineId: string;
  branchOption: "A" | "B";
  branchName: string;
  branchLocation: string;
  personaSeed: PersonaSeedType;
  decisionPrompt: string;
  startQuarter?: number; // default: 1
  endQuarter?: number; // default: 20
  initialStats?: LifeStats; // default: 70 on all metrics
  initialLiquidSavings?: number; // default: 25000
  monthlyIncome?: number; // default: 5000
  monthlyExpenses?: number; // default: 2500
  costOfLivingIndex?: number; // default: 1.0
  persistToDb?: boolean; // default: true
  db?: Db;
  collectionName?: string;
  customChain?: ProviderCandidate[];
  executor?: ObjectExecutor<QuarterDelta>;
  onStepComplete?: (step: TimelineQuarterRecord) => void | Promise<void>;
  onStage?: (stage: QuarterStage) => void | Promise<void>;
  onFallback?: (from: string, to: string) => void | Promise<void>;
}

export interface BatchRunOptions {
  concurrency?: number; // default: 3
}

/**
 * Runs a single 3-month quarter step for a given timeline branch.
 * Orchestrates event rolling, zero-token finances, life agent deltas,
 * stat clamping, and MongoDB upsert.
 */
export async function runQuarterStep(
  config: QuarterStepConfig
): Promise<TimelineQuarterRecord> {
  const {
    sessionId,
    timelineId,
    branchOption,
    branchName,
    branchLocation,
    personaSeed,
    decisionPrompt,
    quarter,
    currentStats,
    currentSavings,
    monthlyIncome,
    monthlyExpenses,
    costOfLivingIndex = 1.0,
    persistToDb = true,
    db,
    collectionName = "timeline_steps",
    customChain,
    executor,
    onStage,
    onFallback,
  } = config;

  const month = quarter * 3;
  const profile = PERSONA_PROFILES[personaSeed];

  // 1. Roll deterministic quarterly unexpected event
  const rolledEvent = rollQuarterEvent({
    seed: `${sessionId}_${timelineId}`,
    quarterIndex: quarter,
    probabilities: profile?.eventProbabilityOverrides,
  });
  await onStage?.({ stage: "roll", event: rolledEvent });

  // 2. Deterministic zero-token financial compounding
  const effectiveMonthlyIncome =
    monthlyIncome * (rolledEvent.financialImpact.incomeMultiplier || 1.0);
  const netEventCashImpact =
    (rolledEvent.financialImpact.lumpSumWindfall || 0) -
    (rolledEvent.financialImpact.lumpSumExpense || 0);

  const financeOutput = calculateQuarterFinance({
    quarter,
    startingSavings: currentSavings,
    monthlyIncome: effectiveMonthlyIncome,
    monthlyBaseExpenses: monthlyExpenses,
    costOfLivingIndex,
    eventCashImpact: netEventCashImpact,
  });
  await onStage?.({
    stage: "calc",
    cash0: currentSavings,
    inc: effectiveMonthlyIncome,
    exp: monthlyExpenses,
    evc: netEventCashImpact,
    cash1: financeOutput.endingSavings,
  });

  // 3. Delta-only LLM Agent Call (Groq / Router)
  const providerName = customChain?.[0]?.name || "groq";
  await onStage?.({ stage: "think", provider: providerName });

  let agentOutput;
  try {
    agentOutput = await simulateQuarterStep({
      quarter,
      month,
      timelineId,
      branchOption,
      branchName,
      branchLocation,
      personaSeed,
      currentStats,
      currentLiquidSavings: currentSavings,
      rolledEvent,
      decisionPrompt,
      customChain,
      executor,
      onFallback,
    });
  } catch {
    agentOutput = {
      delta: {
        quarter,
        deltaHappiness: rolledEvent.statDeltas.deltaHappiness || 0,
        deltaHealth: rolledEvent.statDeltas.deltaHealth || 0,
        deltaRelationships: rolledEvent.statDeltas.deltaRelationships || 0,
        deltaCareer: rolledEvent.statDeltas.deltaCareer || 0,
        diaryEntry: `Quarter ${quarter}: ${rolledEvent.title}. ${rolledEvent.description}`,
        reflection: `Navigating path ${branchOption} as ${personaSeed}.`,
      },
      telemetry: {
        provider: "groq" as const,
        fallbackCount: 3,
        durationMs: 0,
      },
    };
  }

  const rawDelta = agentOutput.delta;

  // 4. Combine event stat deltas + persona quarterly bias + LLM deltas
  const combinedDeltas: LifeStatDeltas = {
    deltaHappiness:
      (rolledEvent.statDeltas.deltaHappiness || 0) +
      (profile?.quarterlyStatBias?.deltaHappiness || 0) +
      rawDelta.deltaHappiness,
    deltaHealth:
      (rolledEvent.statDeltas.deltaHealth || 0) +
      (profile?.quarterlyStatBias?.deltaHealth || 0) +
      rawDelta.deltaHealth,
    deltaRelationships:
      (rolledEvent.statDeltas.deltaRelationships || 0) +
      (profile?.quarterlyStatBias?.deltaRelationships || 0) +
      rawDelta.deltaRelationships,
    deltaCareer:
      (rolledEvent.statDeltas.deltaCareer || 0) +
      (profile?.quarterlyStatBias?.deltaCareer || 0) +
      rawDelta.deltaCareer,
  };
  await onStage?.({ stage: "delta", rawDelta: combinedDeltas });

  // 5. Stat clamping & burnout invariant evaluation
  const clampedResult = applyAndClampStats(currentStats, combinedDeltas);
  const hit = detectHitStat(clampedResult.stats);
  await onStage?.({ stage: "clamp", stats: clampedResult.stats, hit });
  await onStage?.({
    stage: "status",
    status: clampedResult.status,
    burn: clampedResult.isBurnout ? 1 : 0,
  });

  // 6. Build the persistent record
  const stepRecord: TimelineQuarterRecord = {
    sessionId,
    timelineId,
    branchOption,
    branchName,
    branchLocation,
    personaSeed,
    quarter,
    month,
    startingSavings: currentSavings,
    endingSavings: financeOutput.endingSavings,
    netWorthDelta: financeOutput.netQuarterCashFlow,
    monthlyIncome: effectiveMonthlyIncome,
    monthlyBurn: financeOutput.effectiveMonthlyBurn,
    stats: clampedResult.stats,
    statDeltas: {
      deltaHappiness: clampedResult.appliedDeltas.deltaHappiness,
      deltaHealth: clampedResult.appliedDeltas.deltaHealth,
      deltaRelationships: clampedResult.appliedDeltas.deltaRelationships,
      deltaCareer: clampedResult.appliedDeltas.deltaCareer,
    },
    rolledEvent,
    diaryEntry: rawDelta.diaryEntry,
    reflection: rawDelta.reflection,
    isBurnedOut: clampedResult.isBurnout,
    status: clampedResult.isBurnout
      ? "burned_out"
      : quarter === 20
      ? "completed"
      : "active",
    recordedAt: new Date(),
  };

  await onStage?.({ stage: "say", text: stepRecord.diaryEntry });
  await onStage?.({ stage: "done" });

  // 7. Persist to MongoDB
  if (persistToDb) {
    try {
      const database = db || (await getDb());
      const col = database.collection(collectionName);
      await col.updateOne(
        { sessionId, timelineId, quarter },
        { $set: stepRecord },
        { upsert: true }
      );
    } catch (dbError) {
      console.warn(
        `[TimelineRunner] Warning: Failed to persist quarter ${quarter} to MongoDB:`,
        dbError
      );
      if (process.env.NODE_ENV === "production") {
        throw dbError;
      }
    }
  }

  return stepRecord;
}

/**
 * Executes a full timeline run from startQuarter to endQuarter (1 to 20).
 * Statefully propagates financial savings and life stats across time.
 */
export async function runTimeline(
  config: TimelineRunConfig
): Promise<TimelineSummary> {
  const startQ = Math.max(1, config.startQuarter ?? 1);
  const endQ = Math.min(20, config.endQuarter ?? 20);

  let currentStats: LifeStats = config.initialStats
    ? { ...config.initialStats }
    : { happiness: 70, health: 70, relationships: 70, career: 70 };
  let currentSavings = config.initialLiquidSavings ?? 25000;
  const monthlyIncome = config.monthlyIncome ?? 5000;
  const monthlyExpenses = config.monthlyExpenses ?? 2500;
  const costOfLivingIndex = config.costOfLivingIndex ?? 1.0;

  const steps: TimelineQuarterRecord[] = [];
  let lowestHappiness = 100;
  let lowestHappinessQuarter = 1;
  let peakCareer = 0;
  let peakCareerQuarter = 1;
  let hasBurnout = false;

  for (let q = startQ; q <= endQ; q++) {
    const step = await runQuarterStep({
      sessionId: config.sessionId,
      timelineId: config.timelineId,
      branchOption: config.branchOption,
      branchName: config.branchName,
      branchLocation: config.branchLocation,
      personaSeed: config.personaSeed,
      decisionPrompt: config.decisionPrompt,
      quarter: q,
      currentStats,
      currentSavings,
      monthlyIncome,
      monthlyExpenses,
      costOfLivingIndex,
      persistToDb: config.persistToDb,
      db: config.db,
      collectionName: config.collectionName,
      customChain: config.customChain,
      executor: config.executor,
      onStage: config.onStage,
      onFallback: config.onFallback,
    });

    steps.push(step);
    currentStats = { ...step.stats };
    currentSavings = step.endingSavings;

    if (step.isBurnedOut) {
      hasBurnout = true;
    }

    if (step.stats.happiness < lowestHappiness) {
      lowestHappiness = step.stats.happiness;
      lowestHappinessQuarter = q;
    }

    if (step.stats.career > peakCareer) {
      peakCareer = step.stats.career;
      peakCareerQuarter = q;
    }

    if (config.onStepComplete) {
      await config.onStepComplete(step);
    }
  }

  const summary: TimelineSummary = {
    sessionId: config.sessionId,
    timelineId: config.timelineId,
    branchOption: config.branchOption,
    branchName: config.branchName,
    branchLocation: config.branchLocation,
    personaSeed: config.personaSeed,
    totalQuartersCompleted: steps.length,
    finalStats: currentStats,
    finalSavings: currentSavings,
    isBurnedOut: hasBurnout,
    steps,
    lowestHappinessQuarter,
    peakCareerQuarter,
  };

  // Persist timeline summary to "timelines" collection
  if (config.persistToDb !== false) {
    try {
      const database = config.db || (await getDb());
      const timelinesCol = database.collection("timelines");
      await timelinesCol.updateOne(
        { sessionId: config.sessionId, timelineId: config.timelineId },
        { $set: summary },
        { upsert: true }
      );
    } catch (err) {
      console.warn(
        `[TimelineRunner] Warning: Failed to persist timeline summary to MongoDB:`,
        err
      );
      if (process.env.NODE_ENV === "production") {
        throw err;
      }
    }
  }

  return summary;
}

/**
 * Runs batches of parallel timeline branches with concurrency limits
 * to respect rate limits while accelerating multi-universe simulation.
 */
export async function runBatchTimelines(
  configs: TimelineRunConfig[],
  options?: BatchRunOptions
): Promise<TimelineSummary[]> {
  const concurrency = Math.max(1, options?.concurrency ?? 3);
  const results: TimelineSummary[] = [];

  for (let i = 0; i < configs.length; i += concurrency) {
    const chunk = configs.slice(i, i + concurrency);
    const chunkResults = await Promise.all(
      chunk.map((cfg) => runTimeline(cfg))
    );
    results.push(...chunkResults);
  }

  return results;
}
