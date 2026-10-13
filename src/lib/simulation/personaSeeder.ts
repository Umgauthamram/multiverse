/**
 * Persona Seed Generator for 12 Parallel Timelines
 * Assigns 6 distinct behavioral seeds to Option A and 6 to Option B:
 * - Bold (High risk, high upside)
 * - Anxious (Risk-averse, hyper-vigilant)
 * - Workaholic (Extreme output, sacrificed health & social)
 * - Balanced (Mindful boundaries, sustainable rhythm)
 * - Pragmatist (Calculated compounding, steady optimization)
 * - Burnout Risk (Overcommitted, fragile stress thresholds)
 */

import { EventProbabilities } from "@/lib/simulation/eventRoller";
import { LifeStats } from "@/lib/simulation/statClamper";

export type PersonaSeedType =
  | "bold"
  | "anxious"
  | "workaholic"
  | "balanced"
  | "pragmatist"
  | "burnout_risk";

export const ALL_PERSONA_SEEDS: readonly PersonaSeedType[] = Object.freeze([
  "bold",
  "anxious",
  "workaholic",
  "balanced",
  "pragmatist",
  "burnout_risk",
]);

export interface PersonaProfile {
  id: PersonaSeedType;
  label: string;
  archetype: string;
  description: string;
  behavioralModifiers: {
    riskTolerance: number; // 0.0 to 1.0
    workloadIntensity: number; // 0.0 to 1.0
    socialExpenditure: number; // 0.0 to 1.0
  };
  quarterlyStatBias: {
    deltaHappiness: number;
    deltaHealth: number;
    deltaRelationships: number;
    deltaCareer: number;
  };
  eventProbabilityOverrides?: Partial<EventProbabilities>;
}

export const PERSONA_PROFILES: Readonly<Record<PersonaSeedType, PersonaProfile>> =
  Object.freeze({
    bold: {
      id: "bold",
      label: "Bold & Risk-Tolerant",
      archetype: "The Ambitious Leap",
      description:
        "High willingness to take asymmetric bets, pitch bold ideas, and trade near-term comfort for high upside.",
      behavioralModifiers: {
        riskTolerance: 0.85,
        workloadIntensity: 0.75,
        socialExpenditure: 0.6,
      },
      quarterlyStatBias: {
        deltaHappiness: 2,
        deltaHealth: -1,
        deltaRelationships: 0,
        deltaCareer: 3,
      },
      eventProbabilityOverrides: {
        promotion: 0.16,
        layoff: 0.11,
        steady: 0.62,
      },
    },
    anxious: {
      id: "anxious",
      label: "Anxious & Vigilant",
      archetype: "The Defensive Shield",
      description:
        "Continuously scans for catastrophic downside. Prioritizes psychological safety, emergency runway, and consensus.",
      behavioralModifiers: {
        riskTolerance: 0.2,
        workloadIntensity: 0.6,
        socialExpenditure: 0.35,
      },
      quarterlyStatBias: {
        deltaHappiness: -2,
        deltaHealth: -1,
        deltaRelationships: -1,
        deltaCareer: 0,
      },
      eventProbabilityOverrides: {
        layoff: 0.05,
        health_shock: 0.05,
        steady: 0.73,
      },
    },
    workaholic: {
      id: "workaholic",
      label: "Workaholic & Relentless",
      archetype: "The Output Machine",
      description:
        "Sacrifices sleep, weekends, and intimate friendships to maximize career velocity and financial compounding.",
      behavioralModifiers: {
        riskTolerance: 0.6,
        workloadIntensity: 0.95,
        socialExpenditure: 0.15,
      },
      quarterlyStatBias: {
        deltaHappiness: -1,
        deltaHealth: -3,
        deltaRelationships: -3,
        deltaCareer: 4,
      },
      eventProbabilityOverrides: {
        promotion: 0.18,
        health_shock: 0.07,
        steady: 0.63,
      },
    },
    balanced: {
      id: "balanced",
      label: "Balanced & Grounded",
      archetype: "The Mindful Anchor",
      description:
        "Protects physical sleep, relationship health, and hobbies while maintaining steady professional competence.",
      behavioralModifiers: {
        riskTolerance: 0.45,
        workloadIntensity: 0.5,
        socialExpenditure: 0.75,
      },
      quarterlyStatBias: {
        deltaHappiness: 2,
        deltaHealth: 2,
        deltaRelationships: 2,
        deltaCareer: 1,
      },
      eventProbabilityOverrides: {
        health_shock: 0.02,
        serendipity: 0.09,
        steady: 0.71,
      },
    },
    pragmatist: {
      id: "pragmatist",
      label: "Pragmatist & Compounding",
      archetype: "The Calculated Optimizer",
      description:
        "Focuses on predictable savings rates, incremental skill mastery, and avoiding unforced errors.",
      behavioralModifiers: {
        riskTolerance: 0.4,
        workloadIntensity: 0.65,
        socialExpenditure: 0.5,
      },
      quarterlyStatBias: {
        deltaHappiness: 1,
        deltaHealth: 0,
        deltaRelationships: 1,
        deltaCareer: 2,
      },
      eventProbabilityOverrides: {
        layoff: 0.05,
        windfall: 0.02,
        steady: 0.74,
      },
    },
    burnout_risk: {
      id: "burnout_risk",
      label: "Burnout Risk & Overextended",
      archetype: "The Fragile Achiever",
      description:
        "Says yes to too many obligations, internalizes chronic stress, and operates near physical breaking points.",
      behavioralModifiers: {
        riskTolerance: 0.7,
        workloadIntensity: 0.9,
        socialExpenditure: 0.25,
      },
      quarterlyStatBias: {
        deltaHappiness: -3,
        deltaHealth: -4,
        deltaRelationships: -2,
        deltaCareer: 1,
      },
      eventProbabilityOverrides: {
        health_shock: 0.1,
        steady: 0.63,
      },
    },
  });

export interface TimelineBranch {
  timelineId: string;
  branchOption: "A" | "B";
  branchName: string;
  branchLocation: string;
  branchDescription: string;
  personaSeed: PersonaSeedType;
  personaProfile: PersonaProfile;
  initialStats: LifeStats;
  initialLiquidSavings: number;
  initialMonthlyBurn: number;
  seedRandom: string;
  status: "active" | "terminated" | "thriving" | "struggling";
}

export interface GenerateTimelineSeedsInput {
  sessionId?: string;
  optionA: {
    name: string;
    location: string;
    description: string;
  };
  optionB: {
    name: string;
    location: string;
    description: string;
  };
  liquidSavings: number;
  monthlyBurn: number;
  baselineStats?: Partial<LifeStats>;
}

export const DEFAULT_BASELINE_LIFE_STATS: Readonly<LifeStats> = Object.freeze({
  happiness: 65,
  health: 70,
  relationships: 65,
  career: 60,
});

/**
 * Retrieves the full profile for a specific persona seed archetype.
 */
export function getPersonaSeedProfile(seed: PersonaSeedType): PersonaProfile {
  return PERSONA_PROFILES[seed];
}

/**
 * Returns all 6 persona seed profiles.
 */
export function listAllPersonaSeeds(): PersonaProfile[] {
  return ALL_PERSONA_SEEDS.map((seed) => PERSONA_PROFILES[seed]);
}

/**
 * Generates the 12 parallel timeline branches:
 * - 6 unique persona branches for Option A
 * - 6 unique persona branches for Option B
 */
export function generate12TimelineSeeds(
  input: GenerateTimelineSeedsInput
): TimelineBranch[] {
  const sessionId = input.sessionId || `sim_${Date.now()}`;
  const baseStats: LifeStats = {
    ...DEFAULT_BASELINE_LIFE_STATS,
    ...input.baselineStats,
  };

  const branches: TimelineBranch[] = [];

  // Generate 6 branches for Option A
  ALL_PERSONA_SEEDS.forEach((seed, index) => {
    const profile = PERSONA_PROFILES[seed];
    const timelineId = `${sessionId}_A_${seed}`;
    branches.push({
      timelineId,
      branchOption: "A",
      branchName: input.optionA.name,
      branchLocation: input.optionA.location,
      branchDescription: input.optionA.description,
      personaSeed: seed,
      personaProfile: profile,
      initialStats: { ...baseStats },
      initialLiquidSavings: input.liquidSavings,
      initialMonthlyBurn: input.monthlyBurn,
      seedRandom: `${timelineId}_idx${index}`,
      status: "active",
    });
  });

  // Generate 6 branches for Option B
  ALL_PERSONA_SEEDS.forEach((seed, index) => {
    const profile = PERSONA_PROFILES[seed];
    const timelineId = `${sessionId}_B_${seed}`;
    branches.push({
      timelineId,
      branchOption: "B",
      branchName: input.optionB.name,
      branchLocation: input.optionB.location,
      branchDescription: input.optionB.description,
      personaSeed: seed,
      personaProfile: profile,
      initialStats: { ...baseStats },
      initialLiquidSavings: input.liquidSavings,
      initialMonthlyBurn: input.monthlyBurn,
      seedRandom: `${timelineId}_idx${index + 6}`,
      status: "active",
    });
  });

  return branches;
}

/**
 * Asserts structural invariants of a set of timeline branches:
 * - Exactly 12 branches
 * - 6 in Option A, 6 in Option B
 * - Each option contains all 6 unique persona seeds
 * - Unique timeline IDs
 */
export function validateTimelineBranches(branches: TimelineBranch[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (branches.length !== 12) {
    errors.push(`Expected 12 branches, received ${branches.length}`);
  }

  const optionACount = branches.filter((b) => b.branchOption === "A").length;
  const optionBCount = branches.filter((b) => b.branchOption === "B").length;

  if (optionACount !== 6) {
    errors.push(`Expected 6 branches for Option A, received ${optionACount}`);
  }
  if (optionBCount !== 6) {
    errors.push(`Expected 6 branches for Option B, received ${optionBCount}`);
  }

  const ids = new Set(branches.map((b) => b.timelineId));
  if (ids.size !== branches.length) {
    errors.push(`Timeline IDs are not unique across branches`);
  }

  const seedsA = new Set(
    branches.filter((b) => b.branchOption === "A").map((b) => b.personaSeed)
  );
  const seedsB = new Set(
    branches.filter((b) => b.branchOption === "B").map((b) => b.personaSeed)
  );

  ALL_PERSONA_SEEDS.forEach((seed) => {
    if (!seedsA.has(seed)) {
      errors.push(`Option A is missing seed "${seed}"`);
    }
    if (!seedsB.has(seed)) {
      errors.push(`Option B is missing seed "${seed}"`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
