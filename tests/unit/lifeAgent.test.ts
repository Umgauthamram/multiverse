import { describe, it, expect, vi } from "vitest";
import {
  QuarterDeltaSchema,
  QuarterDelta,
  LifeSimulationInput,
  simulateQuarterStep,
} from "@/lib/ai/agents/lifeAgent";
import { ObjectExecutor, ProviderCandidate } from "@/lib/ai/router";
import { LanguageModel } from "ai";

const dummyModel = {
  modelId: "dummy-model",
  provider: "dummy",
} as unknown as LanguageModel;

const dummyModelGetter = () => dummyModel;

describe("Phase 17: Delta-Only Life Simulation Agent (Groq & Router Fallback)", () => {
  const sampleValidDelta: QuarterDelta = {
    quarter: 4,
    deltaHappiness: 8,
    deltaHealth: -5,
    deltaRelationships: -10,
    deltaCareer: 15,
    diaryEntry:
      "Shipped the core microservice architecture today at 11 PM. Feeling completely exhausted yet oddly alive.",
    reflection:
      "Career velocity is surging at the expense of evening calls back home. A quiet sacrifice with mounting debt.",
  };

  const sampleInput: LifeSimulationInput = {
    quarter: 4,
    month: 12,
    timelineId: "tl-alpha-q4",
    branchOption: "A",
    branchName: "London AI Startup",
    branchLocation: "London, UK",
    personaSeed: "bold",
    currentStats: {
      happiness: 58,
      health: 62,
      relationships: 45,
      career: 72,
    },
    currentLiquidSavings: 38400,
    rolledEvent: {
      type: "promotion",
      title: "Senior Lead Title Granted",
      description: "Company acknowledged quarterly milestones; responsibilities scaled up.",
      severity: "positive",
      statDeltas: {
        deltaHappiness: 5,
        deltaHealth: -2,
        deltaRelationships: 0,
        deltaCareer: 10,
      },
      financialImpact: {
        incomeMultiplier: 1.15,
        lumpSumExpense: 0,
        lumpSumWindfall: 2000,
      },
    },
    decisionPrompt:
      "Should I join an early-stage London AI startup or stay in my stable Delhi engineering lead job?",
  };

  const mockChain: ProviderCandidate[] = [
    { name: "groq", getModel: dummyModelGetter },
    { name: "gemini", getModel: dummyModelGetter },
    { name: "nvidia", getModel: dummyModelGetter },
  ];

  describe("QuarterDeltaSchema Validation", () => {
    it("validates a well-formed quarter delta JSON payload", () => {
      const result = QuarterDeltaSchema.safeParse(sampleValidDelta);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.quarter).toBe(4);
        expect(result.data.deltaCareer).toBe(15);
        expect(result.data.diaryEntry).toContain("microservice architecture");
      }
    });

    it("rejects quarter outside 1..20", () => {
      const invalidQuarterZero = { ...sampleValidDelta, quarter: 0 };
      const invalidQuarterTwentyOne = { ...sampleValidDelta, quarter: 21 };

      expect(QuarterDeltaSchema.safeParse(invalidQuarterZero).success).toBe(false);
      expect(QuarterDeltaSchema.safeParse(invalidQuarterTwentyOne).success).toBe(false);
    });

    it("rejects stat delta outside [-30, 30]", () => {
      const deltaTooHigh = { ...sampleValidDelta, deltaHappiness: 35 };
      const deltaTooLow = { ...sampleValidDelta, deltaHealth: -35 };

      expect(QuarterDeltaSchema.safeParse(deltaTooHigh).success).toBe(false);
      expect(QuarterDeltaSchema.safeParse(deltaTooLow).success).toBe(false);
    });

    it("rejects diaryEntry shorter than 10 characters", () => {
      const shortDiary = { ...sampleValidDelta, diaryEntry: "Too brief" };
      const result = QuarterDeltaSchema.safeParse(shortDiary);
      expect(result.success).toBe(false);
    });

    it("rejects diaryEntry exceeding 220 characters", () => {
      const longDiary = {
        ...sampleValidDelta,
        diaryEntry:
          "This diary entry is deliberately made unreasonably verbose to test the strict anti-slop character limits that prevent verbose LLM generated essays from overwhelming the frontend interface and storage bounds across the 20 quarters of life simulation.",
      };
      expect(longDiary.diaryEntry.length).toBeGreaterThan(220);
      const result = QuarterDeltaSchema.safeParse(longDiary);
      expect(result.success).toBe(false);
    });

    it("rejects reflection exceeding 220 characters", () => {
      const longReflection = {
        ...sampleValidDelta,
        reflection: "A".repeat(221),
      };
      const result = QuarterDeltaSchema.safeParse(longReflection);
      expect(result.success).toBe(false);
    });
  });

  describe("simulateQuarterStep Agent Execution", () => {
    it("simulates a quarter step with primary provider (Groq)", async () => {
      let capturedPrompt = "";
      const mockExecutor: ObjectExecutor<QuarterDelta> = vi.fn(
        async ({ prompt }) => {
          capturedPrompt = prompt;
          return { object: sampleValidDelta };
        }
      );

      const output = await simulateQuarterStep({
        ...sampleInput,
        customChain: mockChain,
        executor: mockExecutor,
      });

      expect(mockExecutor).toHaveBeenCalledTimes(1);
      expect(output.delta.quarter).toBe(4);
      expect(output.delta.deltaCareer).toBe(15);
      expect(output.telemetry.provider).toBe("groq");
      expect(output.telemetry.fallbackCount).toBe(0);

      // Verify token-efficient prompt contents
      expect(capturedPrompt).toContain("[Q4 | M12]");
      expect(capturedPrompt).toContain("London AI Startup");
      expect(capturedPrompt).toContain("bold");
      expect(capturedPrompt).toContain("Senior Lead Title Granted");
    });

    it("handles fallback to Gemini when Groq returns 429/5xx error", async () => {
      let attempts = 0;
      const failingMockExecutor: ObjectExecutor<QuarterDelta> = vi.fn(
        async () => {
          attempts++;
          if (attempts === 1) {
            throw new Error("HTTP 429: Groq TPM limit reached");
          }
          return { object: sampleValidDelta };
        }
      );

      const output = await simulateQuarterStep({
        ...sampleInput,
        customChain: mockChain,
        executor: failingMockExecutor,
      });

      expect(attempts).toBe(2);
      expect(output.delta.quarter).toBe(4);
      expect(output.telemetry.provider).toBe("gemini");
      expect(output.telemetry.fallbackCount).toBe(1);
    });
  });
});
