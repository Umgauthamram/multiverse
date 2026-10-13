import { z } from "zod";
import {
  routeGenerateObject,
  ObjectExecutor,
  ProviderCandidate,
} from "@/lib/ai/router";
import { LifeStats } from "@/lib/simulation/statClamper";
import { LifeEvent } from "@/lib/simulation/eventRoller";
import { PersonaSeedType } from "@/lib/simulation/personaSeeder";

/**
 * Quarter Delta Schema
 * Ultra-compact delta-only JSON output (< 80 tokens) representing
 * psychological shifts and personal diary reflection for a single 3-month block.
 */
export const QuarterDeltaSchema = z.object({
  quarter: z.number().int().min(1).max(20),
  deltaHappiness: z.number().int().min(-30).max(30),
  deltaHealth: z.number().int().min(-30).max(30),
  deltaRelationships: z.number().int().min(-30).max(30),
  deltaCareer: z.number().int().min(-30).max(30),
  diaryEntry: z
    .string()
    .trim()
    .min(10, "Diary entry must be at least 10 characters")
    .max(220, "Diary entry must be concise (max 220 chars)"),
  reflection: z
    .string()
    .trim()
    .min(10, "Reflection must be at least 10 characters")
    .max(220, "Reflection must be concise (max 220 chars)"),
});

export type QuarterDelta = z.infer<typeof QuarterDeltaSchema>;

export interface LifeSimulationInput {
  quarter: number; // 1 to 20
  month: number; // 3 to 60
  timelineId: string;
  branchOption: "A" | "B";
  branchName: string;
  branchLocation: string;
  personaSeed: PersonaSeedType;
  currentStats: LifeStats;
  currentLiquidSavings: number;
  rolledEvent: LifeEvent;
  decisionPrompt: string;
  customChain?: ProviderCandidate[];
  executor?: ObjectExecutor<QuarterDelta>;
}

export interface LifeSimulationOutput {
  delta: QuarterDelta;
  telemetry: {
    provider: string;
    fallbackCount: number;
    durationMs: number;
  };
}

const LIFE_AGENT_SYSTEM_PROMPT = `You are the Delta-Only Life Simulation Agent for "Multiverse You".
You simulate a single 3-month quarterly increment in a parallel life timeline.

Mandatory Constraints (Anti-AI-Slop Manifesto):
1. ZERO Conversational Filler: Emit strictly the JSON object. No preambles, no greetings, no Markdown wraps.
2. Token Economy: Output must remain under 80 total tokens.
3. Raw Human Interiority: The diaryEntry must read like an authentic, vulnerable journal snippet written at 11 PM (1–2 sentences). Avoid generic positivity or AI clichés.
4. Psychological Realism: Deltas (-30 to +30) must reflect the tension between the rolled life event, the persona archetype, and the path chosen.`;

export async function simulateQuarterStep(
  input: LifeSimulationInput
): Promise<LifeSimulationOutput> {
  // Compact, high-density prompt minimizing input token overhead (< 140 tokens)
  const prompt = `[Q${input.quarter} | M${input.month}] Dilemma: "${input.decisionPrompt}"
Branch: Path ${input.branchOption} (${input.branchName}, ${input.branchLocation})
Archetype: ${input.personaSeed} | Savings: $${input.currentLiquidSavings}
Current Stats: Joy ${input.currentStats.happiness}, Health ${input.currentStats.health}, Rel ${input.currentStats.relationships}, Career ${input.currentStats.career}
Quarter Event: [${input.rolledEvent.type}] ${input.rolledEvent.title} - ${input.rolledEvent.description}

Output quarter ${input.quarter} deltas (-30..+30), a 1-sentence diary snippet, and a tradeoff reflection.`;

  const result = await routeGenerateObject<QuarterDelta>({
    role: "life_simulation",
    prompt,
    schema: QuarterDeltaSchema,
    system: LIFE_AGENT_SYSTEM_PROMPT,
    customChain: input.customChain,
    executor: input.executor,
  });

  return {
    delta: result.data,
    telemetry: {
      provider: result.telemetry.provider,
      fallbackCount: result.telemetry.fallbackCount,
      durationMs: result.telemetry.durationMs,
    },
  };
}
