import { z } from "zod";
import {
  routeGenerateObject,
  ObjectExecutor,
  ProviderCandidate,
} from "@/lib/ai/router";

export const CastRoleEnum = z.enum([
  "partner",
  "parent",
  "manager",
  "friend",
  "mentor",
  "colleague",
]);

export type CastRole = z.infer<typeof CastRoleEnum>;

export const CastMemberSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2).max(60),
  role: CastRoleEnum,
  archetype: z.string().trim().min(2).max(60),
  personality: z.string().trim().min(10).max(300),
  relationshipContext: z.string().trim().min(10).max(300),
  stakeInDilemma: z.string().trim().min(10).max(300),
});

export const WorldCastSchema = z.object({
  cast: z
    .array(CastMemberSchema)
    .min(3, "Must generate at least 3 supporting characters")
    .max(5, "Must generate at most 5 supporting characters"),
});

export type CastMember = z.infer<typeof CastMemberSchema>;
export type WorldCast = z.infer<typeof WorldCastSchema>;

export interface WorldBuilderInput {
  age: number;
  currentLocation: string;
  decisionPrompt: string;
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
  corePriorities: string[];
  customChain?: ProviderCandidate[];
  executor?: ObjectExecutor<WorldCast>;
}

export interface WorldBuilderOutput {
  cast: CastMember[];
  telemetry: {
    provider: string;
    fallbackCount: number;
    durationMs: number;
  };
}

const WORLD_BUILDER_SYSTEM_PROMPT = `You are the World-Builder Agent for "Multiverse You", a counterfactual decision reflection engine.
Your role is to construct a grounded, nuanced social world of 3 to 5 supporting cast members who surround the protagonist facing a major life dilemma.

Guiding Principles (Anti-AI-Slop Manifesto):
1. Nuanced Human Truths: Avoid sitcom tropes, cartoon cheerleaders, or mustache-twirling antagonists. Real people have mixed motives, quiet anxieties, and competing loyalties.
2. Contextual Grounding: Reflect the geographical and professional reality of Option A and Option B (e.g., relocation friction, visa stakes, family distance, startup volatility, corporate politics).
3. Diversity of Influence: Include differing relationship vectors (e.g., an intimate partner or family anchor, a demanding or protective manager/mentor, and an ambitious or pragmatic friend/colleague).
4. Concrete Stakes: Each character must have an explicit stake or perspective on Path A vs Path B.

Output must satisfy the schema with exactly 3 to 5 cast members.`;

export async function generateWorldCast(
  input: WorldBuilderInput
): Promise<WorldBuilderOutput> {
  const prompt = `Protagonist Profile:
- Age: ${input.age}
- Current Base: ${input.currentLocation}
- Core Priorities: ${input.corePriorities.join(", ")}

The Central Crossroads Dilemma:
"${input.decisionPrompt}"

Counterfactual Option A:
- Name: ${input.optionA.name}
- Location: ${input.optionA.location}
- Strategy: ${input.optionA.description}

Counterfactual Option B:
- Name: ${input.optionB.name}
- Location: ${input.optionB.location}
- Strategy: ${input.optionB.description}

Generate 3 to 5 supporting characters with unique IDs, names, roles, archetypes, personalities, relationship context, and their explicit stake in this dilemma.`;

  const result = await routeGenerateObject<WorldCast>({
    role: "world_builder",
    prompt,
    schema: WorldCastSchema,
    system: WORLD_BUILDER_SYSTEM_PROMPT,
    customChain: input.customChain,
    executor: input.executor,
  });

  return {
    cast: result.data.cast,
    telemetry: {
      provider: result.telemetry.provider,
      fallbackCount: result.telemetry.fallbackCount,
      durationMs: result.telemetry.durationMs,
    },
  };
}
