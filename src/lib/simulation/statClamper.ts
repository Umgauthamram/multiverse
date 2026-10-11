/**
 * Statistical Clamping & Burnout Invariant Engine
 * Enforces strict [0, 100] mathematical boundaries on psychological/life metrics,
 * evaluates burnout and thriving states, and assigns timeline branch health colors.
 */

export interface LifeStats {
  happiness: number; // 0 to 100
  health: number; // 0 to 100
  relationships: number; // 0 to 100
  career: number; // 0 to 100
}

export interface LifeStatDeltas {
  deltaHappiness?: number;
  deltaHealth?: number;
  deltaRelationships?: number;
  deltaCareer?: number;
}

export type TimelineHealthStatus = "thriving" | "plateau" | "struggling" | "burnout";

export interface ClampedStatsResult {
  stats: LifeStats;
  previousStats: LifeStats;
  appliedDeltas: Required<LifeStatDeltas>;
  status: TimelineHealthStatus;
  isBurnout: boolean;
  isThriving: boolean;
  isCrisis: boolean;
  burnoutSeverity?: "moderate" | "critical";
  compositeLifeScore: number; // 0 to 100
}

export interface UserPriorityWeights {
  happiness?: number;
  health?: number;
  relationships?: number;
  career?: number;
}

/**
 * Clamps a single numeric score strictly between 0 and 100.
 */
export function clampStat(value: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return 50; // Fallback to neutral median on NaN
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Applies unconstrained deltas to current life stats, clamping all values to [0, 100]
 * and evaluating burnout / thriving invariants.
 */
export function applyAndClampStats(
  currentStats: LifeStats,
  deltas: LifeStatDeltas,
  weights?: UserPriorityWeights
): ClampedStatsResult {
  // 1. Calculate and clamp each metric strictly between 0 and 100
  const clampedHappiness = clampStat(currentStats.happiness + (deltas.deltaHappiness || 0));
  const clampedHealth = clampStat(currentStats.health + (deltas.deltaHealth || 0));
  const clampedRelationships = clampStat(
    currentStats.relationships + (deltas.deltaRelationships || 0)
  );
  const clampedCareer = clampStat(currentStats.career + (deltas.deltaCareer || 0));

  const updatedStats: LifeStats = {
    happiness: clampedHappiness,
    health: clampedHealth,
    relationships: clampedRelationships,
    career: clampedCareer,
  };

  // 2. Evaluate Burnout & Crisis Invariants
  const isCriticalBurnout = updatedStats.health < 15 && updatedStats.happiness < 20;
  const isModerateBurnout =
    (updatedStats.health < 25 && updatedStats.happiness < 30) || updatedStats.health < 15;
  const isBurnout = isCriticalBurnout || isModerateBurnout;
  const isCrisis = updatedStats.health < 15 || updatedStats.happiness < 15;

  // 3. Evaluate Thriving Invariant
  const isThriving =
    updatedStats.happiness >= 70 &&
    updatedStats.health >= 65 &&
    (updatedStats.career >= 60 || updatedStats.relationships >= 60);

  // 4. Assign visual branch status (matches Canvas tree status colors)
  let status: TimelineHealthStatus = "plateau";
  if (isBurnout) {
    status = "burnout";
  } else if (isCrisis || updatedStats.happiness < 35 || updatedStats.health < 35) {
    status = "struggling";
  } else if (isThriving) {
    status = "thriving";
  }

  // 5. Compute weighted composite life score
  const compositeLifeScore = computeCompositeScore(updatedStats, weights);

  return {
    stats: updatedStats,
    previousStats: { ...currentStats },
    appliedDeltas: {
      deltaHappiness: deltas.deltaHappiness || 0,
      deltaHealth: deltas.deltaHealth || 0,
      deltaRelationships: deltas.deltaRelationships || 0,
      deltaCareer: deltas.deltaCareer || 0,
    },
    status,
    isBurnout,
    isThriving,
    isCrisis,
    burnoutSeverity: isCriticalBurnout ? "critical" : isModerateBurnout ? "moderate" : undefined,
    compositeLifeScore,
  };
}

/**
 * Computes a weighted overall life score (0-100) based on user priority preferences.
 */
export function computeCompositeScore(
  stats: LifeStats,
  weights?: UserPriorityWeights
): number {
  const wHappy = weights?.happiness ?? 1.0;
  const wHealth = weights?.health ?? 1.0;
  const wRel = weights?.relationships ?? 1.0;
  const wCareer = weights?.career ?? 1.0;

  const totalWeight = wHappy + wHealth + wRel + wCareer;
  if (totalWeight <= 0) return 50;

  const weightedSum =
    stats.happiness * wHappy +
    stats.health * wHealth +
    stats.relationships * wRel +
    stats.career * wCareer;

  return clampStat(weightedSum / totalWeight);
}
