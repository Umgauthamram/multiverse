/**
 * Mock Scene Stream
 *
 * Produces deterministic, closed-vocabulary Scene Language lines for 4 stories x 20 quarters
 * using the real sceneCompiler and simulation engines.
 * Exposes a subscribe(onLines) interface with configurable speeds (instant, realistic, slow, stalled)
 * and failure injection (REROUTE, ERROR) for offline development, ?demo=1, and tests.
 */

import { IntakeFormValues } from "@/lib/schemas/intake";
import { generateStorySeeds } from "@/lib/scene/storySeeds";
import { rollQuarterEvent } from "@/lib/simulation/eventRoller";
import { calculateQuarterFinance } from "@/lib/simulation/financeEngine";
import { applyAndClampStats, LifeStats } from "@/lib/simulation/statClamper";
import { PERSONA_PROFILES, PersonaSeedType } from "@/lib/simulation/personaSeeder";
import {
  compileBoot,
  compileFork,
  compileCast,
  compileQuarterStageToLines,
  compileEnd,
  compileProgress,
  compileReroute,
  compileError,
  compileNarrate,
  compileFinish,
} from "@/lib/scene/sceneCompiler";
import { formatLine } from "@/lib/scene/sceneLanguage";

export type MockStreamSpeed = "instant" | "realistic" | "slow" | "stalled";

export type DemoScenario = "normal" | "reroute" | "error" | "stall" | "fast";

export interface MockSceneStreamOptions {
  speed?: MockStreamSpeed;
  sessionId?: string;
  intake?: Partial<IntakeFormValues>;
  scenario?: DemoScenario;
  injectReroute?: boolean;
  injectError?: boolean;
}

export interface MockSceneStream {
  subscribe: (onLines: (lines: string[]) => void) => () => void;
  getAllLines: () => string[];
}

const DEFAULT_INTAKE: IntakeFormValues = {
  decisionPrompt: "Should I join an early-stage AI startup in London or stay as Lead in Delhi?",
  optionA: {
    name: "London AI Startup",
    location: "London, UK",
    description: "Founding Engineer at Seed Stage AI company",
  },
  optionB: {
    name: "Delhi Corporate Lead",
    location: "Delhi, India",
    description: "Engineering Lead at established enterprise",
  },
  age: 28,
  currentLocation: "Bengaluru, India",
  liquidSavings: 25000,
  monthlyBurn: 2200,
  corePriorities: ["career", "wealth"],
};

/**
 * Generates the complete, ordered array of Scene lines for a 4-story x 20-quarter simulation.
 */
export function generateMockSceneLines(options: MockSceneStreamOptions = {}): string[] {
  const isRerouteScenario = options.scenario === "reroute" || !!options.injectReroute;
  const isErrorScenario = options.scenario === "error" || !!options.injectError;

  const sessionId = options.sessionId || `demo-${Date.now()}`;
  const intake: IntakeFormValues = { ...DEFAULT_INTAKE, ...options.intake };
  const lines: string[] = [];

  // 1. BOOT
  lines.push(formatLine(compileBoot(sessionId, 4, 20)));

  // 2. FORK lines for 4 stories
  const seeds = generateStorySeeds(intake, 4);
  for (const seed of seeds) {
    const forkLine = compileFork(
      seed.timelineId,
      seed.branchOption,
      seed.personaSeed,
      seed.branchName,
      seed.branchLocation
    );
    lines.push(formatLine(forkLine));
  }

  // 3. CAST lines (Echo registered NPCs)
  const cast = [
    { role: "partner", name: "Priya", trait: "supportive" },
    { role: "manager", name: "Marcus", trait: "demanding" },
    { role: "friend", name: "Rohan", trait: "entrepreneurial" },
  ];
  for (const c of cast) {
    lines.push(formatLine(compileCast(c.role, c.name, c.trait)));
  }

  // Story simulation tracking states
  interface StoryTracking {
    storyId: string;
    branchOption: "A" | "B";
    personaSeed: PersonaSeedType;
    savings: number;
    monthlyBurn: number;
    monthlyIncome: number;
    stats: LifeStats;
  }

  const stories: StoryTracking[] = seeds.map((s) => ({
    storyId: s.timelineId,
    branchOption: s.branchOption,
    personaSeed: s.personaSeed,
    savings: s.initialLiquidSavings,
    monthlyBurn: s.initialMonthlyBurn,
    monthlyIncome: s.branchOption === "A" ? 5500 : 4200,
    stats: { ...s.initialStats },
  }));

  let totalDoneQuarters = 0;

  // 4. Simulate quarters 1 through 20 across all 4 stories
  for (let q = 1; q <= 20; q++) {
    for (const story of stories) {
      const seedString = `${sessionId}_${story.storyId}_Q${q}`;
      const rolledEvent = rollQuarterEvent({ seed: seedString, quarterIndex: q });

      // Roll stage
      lines.push(
        ...compileQuarterStageToLines("roll", {
          storyId: story.storyId,
          quarter: q,
          rolledEvent,
        })
      );

      // Calc stage
      const eventCashImpact =
        (rolledEvent.financialImpact.lumpSumWindfall || 0) -
        (rolledEvent.financialImpact.lumpSumExpense || 0);

      const effectiveIncome =
        story.monthlyIncome * (rolledEvent.financialImpact.incomeMultiplier || 1.0);

      const finance = calculateQuarterFinance({
        quarter: q,
        startingSavings: story.savings,
        monthlyIncome: effectiveIncome,
        monthlyBaseExpenses: story.monthlyBurn,
        costOfLivingIndex: story.branchOption === "A" ? 1.35 : 1.0,
        eventCashImpact,
      });

      lines.push(
        ...compileQuarterStageToLines("calc", {
          storyId: story.storyId,
          quarter: q,
          finance: {
            startingSavings: story.savings,
            effectiveMonthlyIncome: effectiveIncome,
            monthlyBaseExpenses: story.monthlyBurn,
            netEventCashImpact: eventCashImpact,
            endingSavings: finance.endingSavings,
          },
        })
      );

      story.savings = finance.endingSavings;
      story.monthlyBurn = finance.effectiveMonthlyBurn;

      // Think stage
      lines.push(
        ...compileQuarterStageToLines("think", {
          storyId: story.storyId,
          quarter: q,
          provider: "groq",
        })
      );

      // Optional failure injection: REROUTE
      if (isRerouteScenario && q === 3 && story.storyId === "S1") {
        lines.push(formatLine(compileReroute("groq", "nvidia")));
      }

      // Delta stage
      const profile = PERSONA_PROFILES[story.personaSeed];
      const rawDelta = {
        deltaHappiness:
          (rolledEvent.statDeltas.deltaHappiness || 0) +
          (profile?.quarterlyStatBias?.deltaHappiness || 0),
        deltaHealth:
          (rolledEvent.statDeltas.deltaHealth || 0) +
          (profile?.quarterlyStatBias?.deltaHealth || 0),
        deltaRelationships:
          (rolledEvent.statDeltas.deltaRelationships || 0) +
          (profile?.quarterlyStatBias?.deltaRelationships || 0),
        deltaCareer:
          (rolledEvent.statDeltas.deltaCareer || 0) +
          (profile?.quarterlyStatBias?.deltaCareer || 0),
      };

      lines.push(
        ...compileQuarterStageToLines("delta", {
          storyId: story.storyId,
          quarter: q,
          rawDelta,
        })
      );

      // Clamp & Status stage
      const clamped = applyAndClampStats(story.stats, rawDelta);
      story.stats = clamped.stats;

      lines.push(
        ...compileQuarterStageToLines("clamp", {
          storyId: story.storyId,
          quarter: q,
          clampedStats: clamped.stats,
          isBurnout: clamped.isBurnout,
        })
      );

      // Say & Done stage
      const diarySnippet = `Quarter ${q}: ${rolledEvent.title}. Staying true to the ${story.personaSeed} mindset.`;
      lines.push(
        ...compileQuarterStageToLines("say", {
          storyId: story.storyId,
          quarter: q,
          diaryText: diarySnippet,
        })
      );

      // Progress
      totalDoneQuarters++;
      lines.push(formatLine(compileProgress(totalDoneQuarters, 80)));

      // Optional failure injection: ERROR
      if (isErrorScenario && q === 7 && story.storyId === "S2") {
        lines.push(formatLine(compileError(story.storyId, q, "RATE_LIMIT_EXHAUSTED")));
      }
    }
  }

  // 5. END lines per story
  for (const story of stories) {
    const endLine = compileEnd(story.storyId, story.savings, "thriving");
    lines.push(formatLine(endLine));
  }

  // 6. NARRATE finale sequence
  lines.push(formatLine(compileNarrate("digest")));
  lines.push(formatLine(compileNarrate("gemini")));
  lines.push(formatLine(compileNarrate("report")));
  lines.push(formatLine(compileNarrate("done")));

  // 7. FINISH
  lines.push(formatLine(compileFinish()));

  return lines;
}

/**
 * Creates a mock scene stream matching the SSE subscribe signature.
 */
export function createMockSceneStream(options: MockSceneStreamOptions = {}): MockSceneStream {
  let speed = options.speed || "realistic";
  if (options.scenario === "stall") {
    speed = "stalled";
  } else if (options.scenario === "fast") {
    speed = "instant";
  }
  const allLines = generateMockSceneLines(options);

  return {
    getAllLines: () => [...allLines],
    subscribe(onLines: (lines: string[]) => void): () => void {
      if (speed === "stalled") {
        // Stalled stream emits only BOOT, FORK, CAST, and then halts
        const initialChunk = allLines.slice(0, 8);
        onLines(initialChunk);
        return () => {};
      }

      if (speed === "instant") {
        // Emit entire simulation lines immediately
        onLines(allLines);
        return () => {};
      }

      // Realistic / Slow interval pacing
      const intervalMs = speed === "slow" ? 600 : 180;
      let currentIndex = 0;
      const chunkSize = 8;

      const timer = setInterval(() => {
        if (currentIndex >= allLines.length) {
          clearInterval(timer);
          return;
        }

        const chunk = allLines.slice(currentIndex, currentIndex + chunkSize);
        currentIndex += chunkSize;
        onLines(chunk);

        if (currentIndex >= allLines.length) {
          clearInterval(timer);
        }
      }, intervalMs);

      return () => {
        clearInterval(timer);
      };
    },
  };
}
