/**
 * Dense Digest Serializer for Gemini Synthesis
 *
 * Condenses 12 parallel 20-quarter (5-year) timelines into a structured,
 * high-density Markdown summary digest strictly capped under 2,500 tokens.
 * This digest serves as the foundational multi-horizon prompt context
 * for the Gemini 2.5 Flash Narrator & Comparative Analyst.
 */

import { LifeStats } from "@/lib/simulation/statClamper";
import { LifeEvent } from "@/lib/simulation/eventRoller";
import { PersonaSeedType } from "@/lib/simulation/personaSeeder";

export const MAX_DIGEST_TOKENS = 2500;

export interface TimelineStepSummary {
  quarter: number;
  month: number;
  endingSavings: number;
  netWorthDelta?: number;
  stats: LifeStats;
  rolledEvent?: LifeEvent;
  diaryEntry?: string;
  reflection?: string;
  isBurnedOut?: boolean;
}

export interface TimelineSummaryInput {
  timelineId: string;
  timelineIndex?: number; // 1 to 12
  branchOption: "A" | "B";
  branchName: string;
  branchLocation: string;
  personaSeed: PersonaSeedType | string;
  steps: TimelineStepSummary[];
  finalSavings?: number;
  finalStats?: LifeStats;
  isBurnedOut?: boolean;
}

export interface SimulationDigestInput {
  sessionId: string;
  decisionPrompt: string;
  age?: number;
  currentLocation?: string;
  optionA: {
    name: string;
    location: string;
    description?: string;
  };
  optionB: {
    name: string;
    location: string;
    description?: string;
  };
  corePriorities?: string[];
  timelines: TimelineSummaryInput[];
}

export interface SimulationDigestResult {
  markdown: string;
  tokenEstimate: number;
  characterCount: number;
  timelineCount: number;
  isUnderBudget: boolean;
}

/**
 * Standard token estimation heuristic for English Markdown text (~4 characters per token).
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  // Whitespace-aware heuristic: 1 token ~= 4 characters or ~0.75 words
  const charBased = Math.ceil(text.length / 4);
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const wordBased = Math.ceil(words * 1.3);
  return Math.max(charBased, wordBased);
}

/**
 * Formats numeric currency into compact USD notation (e.g. $185,000 or -$5,000).
 */
export function formatDigestCurrency(amount: number): string {
  if (Number.isNaN(amount) || !Number.isFinite(amount)) return "$0";
  const isNegative = amount < 0;
  const abs = Math.abs(Math.round(amount));
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(abs);
  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Identifies the peak happiness score and month across simulation steps.
 */
export function findPeakHappiness(steps: TimelineStepSummary[]): { score: number; month: number } {
  if (!steps || steps.length === 0) return { score: 50, month: 0 };
  let peak = { score: -Infinity, month: 0 };
  for (const step of steps) {
    if (step.stats && step.stats.happiness > peak.score) {
      peak = { score: step.stats.happiness, month: step.month };
    }
  }
  return peak.score === -Infinity ? { score: 50, month: 0 } : peak;
}

/**
 * Identifies the lowest happiness score and month across simulation steps.
 */
export function findLowestHappiness(steps: TimelineStepSummary[]): { score: number; month: number } {
  if (!steps || steps.length === 0) return { score: 50, month: 0 };
  let lowest = { score: Infinity, month: 0 };
  for (const step of steps) {
    if (step.stats && step.stats.happiness < lowest.score) {
      lowest = { score: step.stats.happiness, month: step.month };
    }
  }
  return lowest.score === Infinity ? { score: 50, month: 0 } : lowest;
}

/**
 * Detects the first month where burnout occurred, or null if never burned out.
 */
export function findBurnoutMonth(steps: TimelineStepSummary[]): number | null {
  if (!steps) return null;
  for (const step of steps) {
    if (step.isBurnedOut) {
      return step.month;
    }
  }
  return null;
}

/**
 * Extracts compact critical life shocks (non-steady events) formatted as "M{month} {title}".
 */
export function extractCriticalEvents(steps: TimelineStepSummary[], maxEvents = 3): string[] {
  if (!steps) return [];
  const events: string[] = [];

  for (const step of steps) {
    if (
      step.rolledEvent &&
      step.rolledEvent.type !== "steady" &&
      step.rolledEvent.severity !== "neutral"
    ) {
      events.push(`M${step.month} ${step.rolledEvent.title}`);
      if (events.length >= maxEvents) break;
    }
  }

  return events.length > 0 ? events : ["Steady progression without major shock"];
}

/**
 * Serializes the complete 12-timeline simulation run into a dense Markdown digest.
 */
export function serializeSimulationDigest(input: SimulationDigestInput): SimulationDigestResult {
  const sections: string[] = [];

  // 1. Mandatory Restrained Header & Dilemma Context
  sections.push(`# Multiverse Simulation Digest: 5-Year Counterfactual Horizon`);
  sections.push(`> Reflective Simulation Engine • Not a Future Prediction`);
  sections.push("");
  sections.push(`### Dilemma Context`);
  sections.push(`- **Core Dilemma**: "${input.decisionPrompt.trim()}"`);
  if (input.age || input.currentLocation) {
    const demog: string[] = [];
    if (input.age) demog.push(`Age: ${input.age}`);
    if (input.currentLocation) demog.push(`Origin: ${input.currentLocation}`);
    sections.push(`- **Demographics**: ${demog.join(" • ")}`);
  }
  sections.push(`- **Path A**: ${input.optionA.name} (${input.optionA.location})`);
  sections.push(`- **Path B**: ${input.optionB.name} (${input.optionB.location})`);
  if (input.corePriorities && input.corePriorities.length > 0) {
    sections.push(`- **Stated Priorities**: ${input.corePriorities.join(", ")}`);
  }
  sections.push("");

  // 2. Structured Markdown Digest Table
  sections.push(`### 12-Timeline Comparative Matrix`);
  sections.push(
    `| Timeline | Path | Seed | Final Net Worth | Peak Happiness | Lowest Happiness | Burnout Month | Critical Shocks |`
  );
  sections.push(`|---|---|---|---|---|---|---|---|`);

  const sortedTimelines = [...input.timelines].sort((a, b) => {
    const idxA = a.timelineIndex ?? 0;
    const idxB = b.timelineIndex ?? 0;
    return idxA - idxB;
  });

  for (let i = 0; i < sortedTimelines.length; i++) {
    const tl = sortedTimelines[i];
    const tlLabel = `T${tl.timelineIndex ?? i + 1}`;
    const pathLabel = `Path ${tl.branchOption} (${tl.branchLocation})`;
    const seedLabel = typeof tl.personaSeed === "string" ? tl.personaSeed : "Balanced";

    const lastStep = tl.steps && tl.steps.length > 0 ? tl.steps[tl.steps.length - 1] : null;
    const finalSavings = tl.finalSavings ?? lastStep?.endingSavings ?? 0;
    const peak = findPeakHappiness(tl.steps);
    const lowest = findLowestHappiness(tl.steps);
    const burnoutMo = findBurnoutMonth(tl.steps);
    const burnoutStr = burnoutMo !== null ? `M${burnoutMo}` : "Never";
    const criticalEvents = extractCriticalEvents(tl.steps, 2).join("; ");

    sections.push(
      `| ${tlLabel} | ${pathLabel} | ${seedLabel} | ${formatDigestCurrency(finalSavings)} | ${peak.score} (M${peak.month}) | ${lowest.score} (M${lowest.month}) | ${burnoutStr} | ${criticalEvents} |`
    );
  }

  sections.push("");

  // 3. Compact Pivotal Divergence Highlights & Authentic Journal Excerpts
  sections.push(`### Pivotal Divergence Moments & Diary Excerpts`);

  for (let i = 0; i < sortedTimelines.length; i++) {
    const tl = sortedTimelines[i];
    const tlLabel = `T${tl.timelineIndex ?? i + 1}`;
    const lowest = findLowestHappiness(tl.steps);
    const peak = findPeakHappiness(tl.steps);

    const lowestStep = tl.steps.find((s) => s.month === lowest.month);
    const peakStep = tl.steps.find((s) => s.month === peak.month);

    const excerpts: string[] = [];

    if (lowestStep?.diaryEntry) {
      const cleanExcerpt = lowestStep.diaryEntry.replace(/[\r\n]+/g, " ").trim();
      const truncated = cleanExcerpt.length > 100 ? `${cleanExcerpt.slice(0, 97)}...` : cleanExcerpt;
      excerpts.push(`*Lowest (M${lowestStep.month})*: "${truncated}"`);
    }

    if (peakStep?.diaryEntry && peakStep.month !== lowestStep?.month) {
      const cleanExcerpt = peakStep.diaryEntry.replace(/[\r\n]+/g, " ").trim();
      const truncated = cleanExcerpt.length > 100 ? `${cleanExcerpt.slice(0, 97)}...` : cleanExcerpt;
      excerpts.push(`*Peak (M${peakStep.month})*: "${truncated}"`);
    }

    // If neither peak nor lowest had diary text, harvest from any step with recorded diary entries
    if (excerpts.length < 2) {
      for (const step of tl.steps) {
        if (
          step.diaryEntry &&
          step.month !== lowestStep?.month &&
          step.month !== peakStep?.month
        ) {
          const cleanExcerpt = step.diaryEntry.replace(/[\r\n]+/g, " ").trim();
          const truncated = cleanExcerpt.length > 100 ? `${cleanExcerpt.slice(0, 97)}...` : cleanExcerpt;
          const tag = step.rolledEvent ? `Shock (M${step.month})` : `M${step.month}`;
          excerpts.push(`*${tag}*: "${truncated}"`);
          if (excerpts.length >= 2) break;
        }
      }
    }

    if (excerpts.length > 0) {
      sections.push(`- **${tlLabel} (${tl.personaSeed})**: ${excerpts.join(" • ")}`);
    }
  }

  const markdown = sections.join("\n");
  const tokenEstimate = estimateTokenCount(markdown);
  const characterCount = markdown.length;

  return {
    markdown,
    tokenEstimate,
    characterCount,
    timelineCount: sortedTimelines.length,
    isUnderBudget: tokenEstimate <= MAX_DIGEST_TOKENS,
  };
}
