import { z } from "zod";
import {
  routeGenerateObject,
  ObjectExecutor,
  ProviderCandidate,
} from "@/lib/ai/router";

/**
 * Zod Schema for a single ranked future outcome (1 to 12)
 */
export const RankedFutureSchema = z.object({
  rank: z.number().int().min(1).max(12),
  timelineId: z.string().min(1),
  path: z.enum(["A", "B"]),
  personaSeed: z.string().min(1),
  score: z.number().min(0).max(100),
  headline: z.string().trim().min(5).max(150),
  tradeoffSummary: z.string().trim().min(10).max(400),
});

export type RankedFuture = z.infer<typeof RankedFutureSchema>;

/**
 * Zod Schema for a pivotal divergence point between Path A and Path B
 */
export const PivotalDivergenceSchema = z.object({
  title: z.string().trim().min(5).max(120),
  month: z.number().int().min(0).max(60),
  description: z.string().trim().min(10).max(500),
  counterfactualComparison: z.string().trim().min(10).max(500),
});

export type PivotalDivergence = z.infer<typeof PivotalDivergenceSchema>;

/**
 * Zod Schema for systemic regret accumulation patterns
 */
export const RegretHotspotSchema = z.object({
  category: z.enum(["health", "relationships", "career", "finances"]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  affectedPaths: z.array(z.enum(["A", "B"])).min(1),
  insight: z.string().trim().min(10).max(500),
  mitigationAdvice: z.string().trim().min(10).max(500),
});

export type RegretHotspot = z.infer<typeof RegretHotspotSchema>;

/**
 * Zod Schema for the complete Gemini Finale Report
 */
export const FinaleReportSchema = z.object({
  executiveReflection: z.string().trim().min(40).max(2500),
  pathAOverallSummary: z.string().trim().min(20).max(800),
  pathBOverallSummary: z.string().trim().min(20).max(800),
  rankedFutures: z.array(RankedFutureSchema).min(1).max(12),
  pivotalDivergences: z.array(PivotalDivergenceSchema).min(2).max(5),
  regretHotspots: z.array(RegretHotspotSchema).min(2).max(6),
  synthesisDisclaimer: z
    .string()
    .default("Reflective Simulation Engine • Not a Future Prediction"),
});

export type FinaleReport = z.infer<typeof FinaleReportSchema>;

export interface NarratorAgentInput {
  digestMarkdown: string;
  decisionPrompt: string;
  optionA: {
    name: string;
    location: string;
  };
  optionB: {
    name: string;
    location: string;
  };
  corePriorities?: string[];
  customChain?: ProviderCandidate[];
  executor?: ObjectExecutor<FinaleReport>;
}

export interface NarratorAgentOutput {
  report: FinaleReport;
  telemetry: {
    provider: string;
    attempts: number;
    durationMs: number;
  };
}

/**
 * Builds the system instructions for Gemini 2.5 Flash Narrator Agent.
 * Enforces Anti-AI-Slop principles and counterfactual reflection framing.
 */
export function buildNarratorSystemPrompt(): string {
  return `You are the Multiverse You Senior Synthesis Analyst and Narrator.
You analyze a dense 5-year simulation digest containing 12 parallel counterfactual futures generated across Path A and Path B.

CRITICAL ARCHITECTURAL CONSTRAINTS & ANTI-AI-SLOP MANIFESTO:
1. REFLECTION, NOT PREDICTION: This engine is a counterfactual reflection mirror, NOT a predictive mechanism or oracle.
   - NEVER use phrases like: "You will achieve", "Your destined future", "The AI predicts", "Guaranteed outcome".
   - ALWAYS use reflective framing: "Simulated branches suggest", "When prioritizing career velocity over rest", "The counterfactual tradeoffs demonstrate".
2. BALANCED OBJECTIVITY:
   - Do NOT tell the user which decision is "right" or "wrong".
   - Respect both Path A and Path B. Highlight the specific costs and compounding rewards inherent to each path.
3. CONCRETE SYNTHESIS:
   - Analyze actual figures from the provided Markdown table: examine peak happiness, burnout occurrences, and final net worth outcomes.
   - Ground your 3 pivotal divergence moments in specific timeline months (e.g. Month 12 funding crunch vs Month 24 relocation strain).
   - Formulate regret hotspots with honest, actionable psychological advice for the user's present-day dilemma.
4. TONE:
   - Restrained, thoughtful, literary, and grounded.
   - Zero marketing jargon, zero fake optimism, zero AI slop.`;
}

/**
 * Builds the user prompt containing the dense Markdown digest.
 */
export function buildNarratorUserPrompt(input: NarratorAgentInput): string {
  const prioritiesStr =
    input.corePriorities && input.corePriorities.length > 0
      ? input.corePriorities.join(", ")
      : "Not specified";

  return `User Decision Dilemma: "${input.decisionPrompt}"
Path A: ${input.optionA.name} (${input.optionA.location})
Path B: ${input.optionB.name} (${input.optionB.location})
Stated User Priorities: ${prioritiesStr}

Below is the structured 12-Timeline Markdown Digest representing 5 years (20 quarters) of stochastic simulation:
${input.digestMarkdown}

Analyze this digest comprehensively. Return a structured FinaleReport containing:
1. An executiveReflection synthesizing the macro counterfactual tradeoffs between Path A and Path B.
2. Distinct pathAOverallSummary and pathBOverallSummary sections.
3. rankedFutures (rank the futures 1 through 12, taking emotional health, burnout avoidance, and wealth compounding into balanced account).
4. pivotalDivergences (the top 2 to 4 irreversible branching moments).
5. regretHotspots (2 to 5 systemic regret accumulation zones across health, relationships, career, or finances).`;
}

/**
 * Generates the Gemini 2.5 Flash Finale Report via the resilient LLM router.
 */
export async function generateNarratorReport(
  input: NarratorAgentInput
): Promise<NarratorAgentOutput> {
  const system = buildNarratorSystemPrompt();
  const prompt = buildNarratorUserPrompt(input);

  const result = await routeGenerateObject<FinaleReport>({
    role: "narrator",
    schema: FinaleReportSchema,
    system,
    prompt,
    customChain: input.customChain,
    executor: input.executor,
  });

  return {
    report: result.data,
    telemetry: {
      provider: result.telemetry.provider,
      attempts: result.telemetry.attempts,
      durationMs: result.telemetry.durationMs,
    },
  };
}
