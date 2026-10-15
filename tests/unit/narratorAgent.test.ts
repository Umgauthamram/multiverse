import { describe, it, expect, vi } from "vitest";
import {
  FinaleReportSchema,
  RankedFutureSchema,
  RegretHotspotSchema,
  buildNarratorSystemPrompt,
  buildNarratorUserPrompt,
  generateNarratorReport,
  FinaleReport,
} from "@/lib/ai/agents/narratorAgent";
import { assertAntiSlopCompliance } from "@/lib/design/antiSlopGuard";
import { ProviderCandidate } from "@/lib/ai/router";
import { LanguageModel } from "ai";

const dummyModel = {
  modelId: "dummy-narrator-model",
  provider: "dummy",
} as unknown as LanguageModel;

const dummyModelGetter = () => dummyModel;

describe("Phase 27: Gemini 2.5 Flash Narrator & Comparative Analyst", () => {
  const mockReport: FinaleReport = {
    executiveReflection:
      "Across 12 simulated branches, Path A offers accelerated financial compounding and leadership autonomy, but exacts a steep tax on physical vitality and social roots. Path B demonstrates higher median emotional stability and deep community ties, with a slower initial wealth accumulation curve that stabilizes comfortably by Year 4.",
    pathAOverallSummary:
      "Path A (London AI Startup) generates higher peak outcomes for high-risk personas, but exposes vulnerable archetypes to severe Year 2 exhaustion.",
    pathBOverallSummary:
      "Path B (Delhi Corporate Lead) preserves relationship bonds and steady savings growth, avoiding structural burnout across all evaluated seeds.",
    rankedFutures: [
      {
        rank: 1,
        timelineId: "tl-3",
        path: "A",
        personaSeed: "balanced",
        score: 88,
        headline: "Disciplined High-Yield Autonomy",
        tradeoffSummary: "Maintained clear boundaries amidst startup chaos, capturing equity upside without sacrificing physical health.",
      },
      {
        rank: 2,
        timelineId: "tl-9",
        path: "B",
        personaSeed: "balanced",
        score: 85,
        headline: "Compounding Stability & Family Proximity",
        tradeoffSummary: "Steady career elevation in Delhi with rich social connections and low cognitive distress.",
      },
      {
        rank: 3,
        timelineId: "tl-1",
        path: "A",
        personaSeed: "bold",
        score: 82,
        headline: "High-Growth Breakthrough at Acute Relational Distance",
        tradeoffSummary: "Significant net worth expansion offset by personal isolation in early London winters.",
      },
    ],
    pivotalDivergences: [
      {
        title: "Month 12: Capital Infusion vs Corporate Elevation",
        month: 12,
        description: "Path A commits to high-stakes venture runway while Path B receives a structured senior corporate promotion.",
        counterfactualComparison: "In London, equity risk accelerates; in Delhi, baseline financial predictability cements.",
      },
      {
        title: "Month 24: International Visa Strain vs Domestic Roots",
        month: 24,
        description: "Path A encounters regulatory immigration hurdles, while Path B leverages local network for lateral mobility.",
        counterfactualComparison: "Anxious personas in London face acute stress spikes; Delhi branches report stable relationship indices.",
      },
      {
        title: "Month 36: Startup Exit Liquidity vs Long-Term Vesting",
        month: 36,
        description: "Path A reaches liquidity realization for surviving branches, creating divergence in net worth.",
        counterfactualComparison: "London bold seeds surpass $180k savings; Delhi branches build steady multi-year family reserves.",
      },
    ],
    regretHotspots: [
      {
        category: "health",
        severity: "critical",
        affectedPaths: ["A"],
        insight: "Overcommitment during early startup scaling leads to chronic sleep deprivation and Month 18 burnout shocks.",
        mitigationAdvice: "Implement non-negotiable physical rest boundaries before signing early-stage equity contracts.",
      },
      {
        category: "relationships",
        severity: "medium",
        affectedPaths: ["A"],
        insight: "Relocating abroad without a pre-existing social safety net degrades emotional resilience in winter quarters.",
        mitigationAdvice: "Schedule quarterly visits home and budget explicitly for social community onboarding in new cities.",
      },
      {
        category: "career",
        severity: "low",
        affectedPaths: ["B"],
        insight: "Occasional cognitive restlessness in steady corporate environments where technical innovation moves slowly.",
        mitigationAdvice: "Cultivate open-source or advisory side initiatives to satisfy creative ambition while preserving stability.",
      },
    ],
    synthesisDisclaimer: "Reflective Simulation Engine • Not a Future Prediction",
  };

  describe("Schema Validation", () => {
    it("validates well-formed FinaleReport structure", () => {
      const parsed = FinaleReportSchema.parse(mockReport);
      expect(parsed.rankedFutures).toHaveLength(3);
      expect(parsed.pivotalDivergences).toHaveLength(3);
      expect(parsed.regretHotspots).toHaveLength(3);
      expect(parsed.synthesisDisclaimer).toBe("Reflective Simulation Engine • Not a Future Prediction");
    });

    it("rejects invalid ranked futures with ranks outside 1..12 or missing paths", () => {
      expect(() => {
        RankedFutureSchema.parse({
          rank: 15, // Out of bounds
          timelineId: "tl-1",
          path: "A",
          personaSeed: "bold",
          score: 80,
          headline: "Title",
          tradeoffSummary: "Valid summary tradeoff text here.",
        });
      }).toThrow();

      expect(() => {
        RankedFutureSchema.parse({
          rank: 1,
          timelineId: "tl-1",
          path: "C", // Invalid path enum
          personaSeed: "bold",
          score: 80,
          headline: "Title",
          tradeoffSummary: "Valid summary tradeoff text here.",
        });
      }).toThrow();
    });

    it("rejects invalid regret hotspots with unapproved category", () => {
      expect(() => {
        RegretHotspotSchema.parse({
          category: "spiritual", // Not in enum
          severity: "high",
          affectedPaths: ["A"],
          insight: "Valid insight text here.",
          mitigationAdvice: "Valid mitigation advice text here.",
        });
      }).toThrow();
    });
  });

  describe("Prompt Construction & Anti-AI-Slop Compliance", () => {
    it("builds narrator system prompt strictly honoring counterfactual reflection guidelines", () => {
      const prompt = buildNarratorSystemPrompt();
      expect(prompt).toContain("REFLECTION, NOT PREDICTION");
      expect(prompt).toContain("BALANCED OBJECTIVITY");
      expect(prompt).toContain("ANTI-AI-SLOP MANIFESTO");

      assertAntiSlopCompliance(prompt);
    });

    it("builds comprehensive user prompt containing digest table and decision context", () => {
      const userPrompt = buildNarratorUserPrompt({
        digestMarkdown: "| Timeline | Path | Seed |\n| T1 | Path A | Bold |",
        decisionPrompt: "Should I accept the London startup offer?",
        optionA: { name: "London AI Startup", location: "London, UK" },
        optionB: { name: "Delhi Corporate Lead", location: "Delhi, India" },
        corePriorities: ["Autonomy", "Health"],
      });

      expect(userPrompt).toContain("Should I accept the London startup offer?");
      expect(userPrompt).toContain("London AI Startup (London, UK)");
      expect(userPrompt).toContain("Delhi Corporate Lead (Delhi, India)");
      expect(userPrompt).toContain("Autonomy, Health");
      expect(userPrompt).toContain("| Timeline | Path | Seed |");
    });
  });

  describe("Agent Execution via Resilient Router", () => {
    it("successfully generates structured report through executor", async () => {
      const mockExecutor = vi.fn().mockResolvedValue({
        object: mockReport,
      });

      const customChain: ProviderCandidate[] = [
        {
          name: "gemini",
          getModel: dummyModelGetter,
        },
      ];

      const result = await generateNarratorReport({
        digestMarkdown: "| T1 | Path A | $180,000 |",
        decisionPrompt: "Should I move to London or stay in Delhi?",
        optionA: { name: "London AI Startup", location: "London, UK" },
        optionB: { name: "Delhi Corporate Lead", location: "Delhi, India" },
        customChain,
        executor: mockExecutor,
      });

      expect(mockExecutor).toHaveBeenCalledTimes(1);
      expect(result.report.rankedFutures).toHaveLength(3);
      expect(result.report.pivotalDivergences).toHaveLength(3);
      expect(result.report.regretHotspots).toHaveLength(3);
      expect(result.telemetry.provider).toBe("gemini");
      expect(result.telemetry.attempts).toBe(1);

      assertAntiSlopCompliance(result.report.executiveReflection);
    });

    it("transparently fails over to secondary provider (Groq) when Gemini encounters 429", async () => {
      const mockExecutor = vi
        .fn()
        .mockRejectedValueOnce(new Error("HTTP 429: Gemini quota limit reached"))
        .mockResolvedValueOnce({
          object: mockReport,
        });

      const customChain: ProviderCandidate[] = [
        {
          name: "gemini",
          getModel: dummyModelGetter,
        },
        {
          name: "groq",
          getModel: dummyModelGetter,
        },
      ];

      const result = await generateNarratorReport({
        digestMarkdown: "| T1 | Path A | $180,000 |",
        decisionPrompt: "Should I move to London or stay in Delhi?",
        optionA: { name: "London AI Startup", location: "London, UK" },
        optionB: { name: "Delhi Corporate Lead", location: "Delhi, India" },
        customChain,
        executor: mockExecutor,
      });

      expect(mockExecutor).toHaveBeenCalledTimes(2);
      expect(result.telemetry.provider).toBe("groq");
      expect(result.telemetry.attempts).toBe(2);
      expect(result.report.rankedFutures).toHaveLength(3);
    });
  });
});
