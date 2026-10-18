/**
 * Story Seeds Generator for Multiverse Theater
 * Generates the deterministic 4-story roster:
 * S1: Path A (Bold & Risk-Tolerant)
 * S2: Path A (Anxious & Vigilant)
 * S3: Path B (Balanced & Mindful)
 * S4: Path B (Workaholic & High Output)
 */

import {
  PersonaSeedType,
  TimelineBranch,
  getPersonaSeedProfile,
  DEFAULT_BASELINE_LIFE_STATS,
} from "@/lib/simulation/personaSeeder";
import { LifeStats } from "@/lib/simulation/statClamper";
import { IntakeFormValues } from "@/lib/schemas/intake";

export interface StoryRosterItem {
  storyId: string;
  option: "A" | "B";
  seed: PersonaSeedType;
}

export const STORY_ROSTER: readonly StoryRosterItem[] = Object.freeze([
  { storyId: "S1", option: "A", seed: "bold" },
  { storyId: "S2", option: "A", seed: "anxious" },
  { storyId: "S3", option: "B", seed: "balanced" },
  { storyId: "S4", option: "B", seed: "workaholic" },
]);

export interface StorySeedsInput {
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

/**
 * Generates deterministic timeline seeds for the Multiverse Theater.
 * By default yields the canonical 4 stories, honoring the count parameter.
 */
export function generateStorySeeds(
  input: IntakeFormValues | StorySeedsInput,
  count: number = 4
): TimelineBranch[] {
  const sessionId = "sessionId" in input && input.sessionId ? input.sessionId : "sim_theater";
  const baseStats: LifeStats = {
    ...DEFAULT_BASELINE_LIFE_STATS,
    ...("baselineStats" in input ? input.baselineStats : undefined),
  };

  const clampedCount = Math.max(1, count);
  const branches: TimelineBranch[] = [];

  for (let i = 0; i < clampedCount; i++) {
    // If count exceeds canonical roster length, cycle deterministically
    const rosterItem = STORY_ROSTER[i % STORY_ROSTER.length];
    const storyId = clampedCount <= STORY_ROSTER.length ? rosterItem.storyId : `S${i + 1}`;
    const branchConfig = rosterItem.option === "A" ? input.optionA : input.optionB;
    const profile = getPersonaSeedProfile(rosterItem.seed);

    // Initial stats incorporate persona baseline bias
    const initialStats: LifeStats = {
      happiness: Math.max(
        0,
        Math.min(100, baseStats.happiness + profile.quarterlyStatBias.deltaHappiness)
      ),
      health: Math.max(
        0,
        Math.min(100, baseStats.health + profile.quarterlyStatBias.deltaHealth)
      ),
      relationships: Math.max(
        0,
        Math.min(
          100,
          baseStats.relationships + profile.quarterlyStatBias.deltaRelationships
        )
      ),
      career: Math.max(
        0,
        Math.min(100, baseStats.career + profile.quarterlyStatBias.deltaCareer)
      ),
    };

    branches.push({
      timelineId: storyId,
      branchOption: rosterItem.option,
      branchName: branchConfig.name,
      branchLocation: branchConfig.location,
      branchDescription: branchConfig.description,
      personaSeed: rosterItem.seed,
      personaProfile: profile,
      initialStats,
      initialLiquidSavings: input.liquidSavings,
      initialMonthlyBurn: input.monthlyBurn,
      seedRandom: `${sessionId}_${storyId}_${rosterItem.option}_${rosterItem.seed}`,
      status: "active",
    });
  }

  return branches;
}
