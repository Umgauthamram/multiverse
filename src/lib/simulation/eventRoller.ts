/**
 * Weighted Random Life Event Roller
 * Zero-token stochastic engine for rolling quarterly unexpected events
 * (Promotion, Layoff, Health Shock, Windfall, Serendipity, Steady) with calibrated baseline probabilities
 * and deterministic seed support for reproducible simulation branches.
 */

export type LifeEventType =
  | "promotion"
  | "layoff"
  | "health_shock"
  | "windfall"
  | "serendipity"
  | "steady";

export interface EventProbabilities {
  promotion: number;
  layoff: number;
  health_shock: number;
  windfall: number;
  serendipity: number;
  steady: number;
}

/**
 * Calibrated baseline probabilities synthesizing PROJECT_PLAN.md & WORKLOAD_30_PHASES.md:
 * - Promotion: 12% (0.12)
 * - Layoff: 8% (0.08)
 * - Health Shock: 4% (0.04)
 * - Windfall: 1% (0.01)
 * - Serendipitous Connection / Romance: 6% (0.06)
 * - Steady: 69% (0.69)
 * Total sum: exactly 100% (1.00)
 */
export const DEFAULT_EVENT_PROBABILITIES: Readonly<EventProbabilities> = Object.freeze({
  promotion: 0.12,
  layoff: 0.08,
  health_shock: 0.04,
  windfall: 0.01,
  serendipity: 0.06,
  steady: 0.69,
});

export interface LifeEventStatDeltas {
  deltaHappiness: number;
  deltaHealth: number;
  deltaRelationships: number;
  deltaCareer: number;
}

export interface LifeEventFinancialImpact {
  /** Multiplier applied to quarterly income (e.g. 1.15 for raise, 0.0 for layoff) */
  incomeMultiplier: number;
  /** Unplanned emergency expense deducted from savings */
  lumpSumExpense: number;
  /** Unplanned windfall added to savings */
  lumpSumWindfall: number;
}

export interface LifeEvent {
  type: LifeEventType;
  title: string;
  description: string;
  severity: "positive" | "negative" | "neutral";
  statDeltas: LifeEventStatDeltas;
  financialImpact: LifeEventFinancialImpact;
  quarterIndex?: number;
  timelineId?: string;
  seedUsed?: string | number;
}

export interface RollOptions {
  seed?: string | number;
  rng?: () => number;
  quarterIndex?: number;
  timelineId?: string;
  probabilities?: Partial<EventProbabilities>;
}

/**
 * FNV-1a 32-bit hash implementation to convert string seeds into deterministic unsigned integers.
 */
export function hashStringToSeed(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0;
  }
  return h;
}

/**
 * Mulberry32 PRNG
 * High-performance, high-entropy 32-bit PRNG generator yielding floats in [0, 1).
 */
export function createPrng(seed: number | string): () => number {
  let state = typeof seed === "string" ? hashStringToSeed(seed) : (seed >>> 0);
  if (state === 0) {
    state = 1;
  }

  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Validates and normalizes event probabilities so that their sum equals 1.0.
 */
export function normalizeProbabilities(
  partial?: Partial<EventProbabilities>
): EventProbabilities {
  if (!partial) {
    return { ...DEFAULT_EVENT_PROBABILITIES };
  }

  const merged: EventProbabilities = {
    promotion: Math.max(0, partial.promotion ?? DEFAULT_EVENT_PROBABILITIES.promotion),
    layoff: Math.max(0, partial.layoff ?? DEFAULT_EVENT_PROBABILITIES.layoff),
    health_shock: Math.max(0, partial.health_shock ?? DEFAULT_EVENT_PROBABILITIES.health_shock),
    windfall: Math.max(0, partial.windfall ?? DEFAULT_EVENT_PROBABILITIES.windfall),
    serendipity: Math.max(0, partial.serendipity ?? DEFAULT_EVENT_PROBABILITIES.serendipity),
    steady: Math.max(0, partial.steady ?? DEFAULT_EVENT_PROBABILITIES.steady),
  };

  const total =
    merged.promotion +
    merged.layoff +
    merged.health_shock +
    merged.windfall +
    merged.serendipity +
    merged.steady;

  if (total === 0) {
    return { ...DEFAULT_EVENT_PROBABILITIES };
  }

  return {
    promotion: merged.promotion / total,
    layoff: merged.layoff / total,
    health_shock: merged.health_shock / total,
    windfall: merged.windfall / total,
    serendipity: merged.serendipity / total,
    steady: merged.steady / total,
  };
}

/**
 * Rolls an event type based on calibrated cumulative probability thresholds.
 */
export function rollEventType(
  rng: () => number = Math.random,
  probabilities?: Partial<EventProbabilities>
): LifeEventType {
  const p = normalizeProbabilities(probabilities);
  const roll = rng();

  // Cumulative intervals:
  // [0, promotion)
  // [promotion, promotion + layoff)
  // [promotion + layoff, promotion + layoff + health_shock)
  // [promotion + layoff + health_shock, promotion + layoff + health_shock + windfall)
  // [..., ... + serendipity)
  // [..., 1.0] -> steady
  const threshPromotion = p.promotion;
  const threshLayoff = threshPromotion + p.layoff;
  const threshHealthShock = threshLayoff + p.health_shock;
  const threshWindfall = threshHealthShock + p.windfall;
  const threshSerendipity = threshWindfall + p.serendipity;

  if (roll < threshPromotion) {
    return "promotion";
  }
  if (roll < threshLayoff) {
    return "layoff";
  }
  if (roll < threshHealthShock) {
    return "health_shock";
  }
  if (roll < threshWindfall) {
    return "windfall";
  }
  if (roll < threshSerendipity) {
    return "serendipity";
  }
  return "steady";
}

/**
 * Template catalogues for constructing realistic narrative descriptions and mathematical impacts.
 */
const EVENT_TEMPLATES: Record<
  LifeEventType,
  {
    titles: string[];
    descriptions: string[];
    severity: "positive" | "negative" | "neutral";
    baseDeltas: LifeEventStatDeltas;
    financialImpact: LifeEventFinancialImpact;
  }
> = {
  promotion: {
    titles: [
      "Senior Advancement & Scope Expansion",
      "Key Leadership Promotion",
      "Executive Title Elevation & Merit Raise",
    ],
    descriptions: [
      "Recognized for strategic delivery. Expanded authority and quarterly compensation package.",
      "Promoted to lead critical initiatives with higher visibility and salary bump.",
      "Stepped into a pivotal leadership role with increased responsibility.",
    ],
    severity: "positive",
    baseDeltas: {
      deltaHappiness: 8,
      deltaHealth: -2,
      deltaRelationships: -2,
      deltaCareer: 16,
    },
    financialImpact: {
      incomeMultiplier: 1.15,
      lumpSumExpense: 0,
      lumpSumWindfall: 0,
    },
  },
  layoff: {
    titles: [
      "Corporate Downsizing & Restructuring",
      "Sudden Department Elimination",
      "Economic Headwinds & Severance Transition",
    ],
    descriptions: [
      "Sudden organizational restructuring triggered layoffs across the business unit.",
      "Division closed amid broader corporate budget cutbacks; transitioning to severance.",
      "Downsizing eliminated role unexpectedly, triggering emergency runway preservation.",
    ],
    severity: "negative",
    baseDeltas: {
      deltaHappiness: -16,
      deltaHealth: -6,
      deltaRelationships: -4,
      deltaCareer: -22,
    },
    financialImpact: {
      incomeMultiplier: 0.0,
      lumpSumExpense: 0,
      lumpSumWindfall: 0,
    },
  },
  health_shock: {
    titles: [
      "Acute Medical Event & Mandated Rest",
      "Severe Exhaustion & Health Intervention",
      "Physical Injury Requiring Rehabilitation",
    ],
    descriptions: [
      "Physical health reached a breaking point, necessitating immediate medical consultation and rest.",
      "An unexpected physical diagnosis incurred out-of-pocket medical bills and time off.",
      "Acute fatigue and illness forced temporary withdrawal from high-intensity commitments.",
    ],
    severity: "negative",
    baseDeltas: {
      deltaHappiness: -14,
      deltaHealth: -28,
      deltaRelationships: 4,
      deltaCareer: -10,
    },
    financialImpact: {
      incomeMultiplier: 1.0,
      lumpSumExpense: 6500,
      lumpSumWindfall: 0,
    },
  },
  windfall: {
    titles: [
      "Early Equity Liquidity Window",
      "Unanticipated Financial Grant / Inheritance",
      "Major Consulting Bonus & Windfall",
    ],
    descriptions: [
      "A surprise liquidity event or side-project milestone provided an unexpected lump-sum cash injection.",
      "Unanticipated capital distribution significantly expanded liquid cash reserves.",
      "Substantial bonus payout cleared near-term liabilities and expanded runway.",
    ],
    severity: "positive",
    baseDeltas: {
      deltaHappiness: 15,
      deltaHealth: 2,
      deltaRelationships: 2,
      deltaCareer: 4,
    },
    financialImpact: {
      incomeMultiplier: 1.0,
      lumpSumExpense: 0,
      lumpSumWindfall: 20000,
    },
  },
  serendipity: {
    titles: [
      "Serendipitous Connection & Deep Belonging",
      "Pivotal Mentorship & Collaborative Spark",
      "Meaningful Relationship Milestone",
    ],
    descriptions: [
      "Encountered a significant partner, co-founder, or mentor who provided deep mutual encouragement.",
      "A serendipitous relationship expanded emotional support and shared life perspective.",
      "Formed an unexpected, high-trust bond that anchored emotional well-being and life clarity.",
    ],
    severity: "positive",
    baseDeltas: {
      deltaHappiness: 12,
      deltaHealth: 2,
      deltaRelationships: 20,
      deltaCareer: 6,
    },
    financialImpact: {
      incomeMultiplier: 1.0,
      lumpSumExpense: 0,
      lumpSumWindfall: 0,
    },
  },
  steady: {
    titles: [
      "Steady Operational Cadence",
      "Incremental Focus & Habit Execution",
      "Predictable Routine Progression",
    ],
    descriptions: [
      "Consistent quarters of balanced execution without major systemic disruptions.",
      "Stable cadence across personal and professional priorities; steady progress.",
      "Routine quarter characterized by manageable demands and gradual milestones.",
    ],
    severity: "neutral",
    baseDeltas: {
      deltaHappiness: 1,
      deltaHealth: 0,
      deltaRelationships: 1,
      deltaCareer: 2,
    },
    financialImpact: {
      incomeMultiplier: 1.0,
      lumpSumExpense: 0,
      lumpSumWindfall: 0,
    },
  },
};

/**
 * Builds a concrete LifeEvent object for a given event type.
 */
export function createEventDetails(
  type: LifeEventType,
  options?: {
    quarterIndex?: number;
    timelineId?: string;
    seedUsed?: string | number;
    rng?: () => number;
  }
): LifeEvent {
  const template = EVENT_TEMPLATES[type];
  const rng = options?.rng ?? Math.random;

  const titleIdx = Math.floor(rng() * template.titles.length);
  const descIdx = Math.floor(rng() * template.descriptions.length);

  return {
    type,
    title: template.titles[titleIdx] ?? template.titles[0],
    description: template.descriptions[descIdx] ?? template.descriptions[0],
    severity: template.severity,
    statDeltas: { ...template.baseDeltas },
    financialImpact: { ...template.financialImpact },
    quarterIndex: options?.quarterIndex,
    timelineId: options?.timelineId,
    seedUsed: options?.seedUsed,
  };
}

/**
 * Rolls an event for a single simulated quarter, supporting deterministic seed execution.
 */
export function rollQuarterEvent(options: RollOptions = {}): LifeEvent {
  const { seed, quarterIndex, timelineId, probabilities } = options;

  let rng: () => number;
  if (options.rng) {
    rng = options.rng;
  } else if (seed !== undefined) {
    // Generate derived seed combined with quarter index for distinct quarterly rolls
    const compositeSeed = quarterIndex !== undefined ? `${seed}_q${quarterIndex}` : seed;
    rng = createPrng(compositeSeed);
  } else {
    rng = Math.random;
  }

  const eventType = rollEventType(rng, probabilities);

  return createEventDetails(eventType, {
    quarterIndex,
    timelineId,
    seedUsed: seed,
    rng,
  });
}

/**
 * Deterministically rolls all 20 quarters of events for a simulated timeline branch.
 */
export function rollTimelineEvents(
  timelineSeed: string | number,
  quartersCount = 20,
  probabilities?: Partial<EventProbabilities>
): LifeEvent[] {
  const events: LifeEvent[] = [];

  for (let q = 0; q < quartersCount; q++) {
    const event = rollQuarterEvent({
      seed: timelineSeed,
      quarterIndex: q,
      probabilities,
    });
    events.push(event);
  }

  return events;
}

/**
 * Monte Carlo simulator to verify statistical distributions over N trials.
 */
export function simulateDistribution(
  trials: number,
  seed?: string | number,
  probabilities?: Partial<EventProbabilities>
): Record<
  LifeEventType,
  { count: number; frequency: number; target: number; delta: number }
> {
  const p = normalizeProbabilities(probabilities);
  const counts: Record<LifeEventType, number> = {
    promotion: 0,
    layoff: 0,
    health_shock: 0,
    windfall: 0,
    serendipity: 0,
    steady: 0,
  };

  const rng = seed !== undefined ? createPrng(seed) : Math.random;

  for (let i = 0; i < trials; i++) {
    const eventType = rollEventType(rng, p);
    counts[eventType]++;
  }

  const result = {} as Record<
    LifeEventType,
    { count: number; frequency: number; target: number; delta: number }
  >;

  (Object.keys(counts) as LifeEventType[]).forEach((type) => {
    const count = counts[type];
    const frequency = count / trials;
    const target = p[type];
    const delta = Math.abs(frequency - target);
    result[type] = { count, frequency, target, delta };
  });

  return result;
}
