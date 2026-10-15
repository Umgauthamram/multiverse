import { describe, it, expect } from "vitest";
import {
  serializeSimulationDigest,
  estimateTokenCount,
  formatDigestCurrency,
  findPeakHappiness,
  findLowestHappiness,
  findBurnoutMonth,
  extractCriticalEvents,
  MAX_DIGEST_TOKENS,
  SimulationDigestInput,
  TimelineSummaryInput,
  TimelineStepSummary,
} from "@/lib/simulation/digestSerializer";
import { assertAntiSlopCompliance } from "@/lib/design/antiSlopGuard";
import { PersonaSeedType, ALL_PERSONA_SEEDS } from "@/lib/simulation/personaSeeder";

describe("Phase 26: Dense Digest Serializer for Gemini Synthesis", () => {
  describe("Utility & Heuristic Functions", () => {
    it("estimates tokens realistically for markdown text", () => {
      expect(estimateTokenCount("")).toBe(0);
      const sample = "This is a clean markdown sentence for testing token counts.";
      const estimate = estimateTokenCount(sample);
      expect(estimate).toBeGreaterThan(5);
      expect(estimate).toBeLessThan(30);
    });

    it("formats currency values compactly", () => {
      expect(formatDigestCurrency(0)).toBe("$0");
      expect(formatDigestCurrency(185000)).toBe("$185,000");
      expect(formatDigestCurrency(-2500)).toBe("-$2,500");
      expect(formatDigestCurrency(NaN)).toBe("$0");
    });

    it("accurately identifies peak and lowest happiness across steps", () => {
      const steps: TimelineStepSummary[] = [
        {
          quarter: 1,
          month: 3,
          endingSavings: 25000,
          stats: { happiness: 60, health: 70, relationships: 65, career: 60 },
        },
        {
          quarter: 2,
          month: 6,
          endingSavings: 30000,
          stats: { happiness: 85, health: 65, relationships: 60, career: 75 },
        },
        {
          quarter: 3,
          month: 9,
          endingSavings: 22000,
          stats: { happiness: 38, health: 50, relationships: 45, career: 65 },
        },
      ];

      const peak = findPeakHappiness(steps);
      expect(peak.score).toBe(85);
      expect(peak.month).toBe(6);

      const lowest = findLowestHappiness(steps);
      expect(lowest.score).toBe(38);
      expect(lowest.month).toBe(9);
    });

    it("detects first burnout month accurately", () => {
      const unburnedSteps: TimelineStepSummary[] = [
        { quarter: 1, month: 3, endingSavings: 10000, stats: { happiness: 50, health: 50, relationships: 50, career: 50 }, isBurnedOut: false },
        { quarter: 2, month: 6, endingSavings: 12000, stats: { happiness: 55, health: 50, relationships: 50, career: 55 }, isBurnedOut: false },
      ];
      expect(findBurnoutMonth(unburnedSteps)).toBeNull();

      const burnedSteps: TimelineStepSummary[] = [
        ...unburnedSteps,
        { quarter: 3, month: 9, endingSavings: 8000, stats: { happiness: 20, health: 18, relationships: 30, career: 40 }, isBurnedOut: true },
      ];
      expect(findBurnoutMonth(burnedSteps)).toBe(9);
    });

    it("extracts critical events ignoring neutral/steady quarters", () => {
      const steps: TimelineStepSummary[] = [
        {
          quarter: 1,
          month: 3,
          endingSavings: 10000,
          stats: { happiness: 50, health: 50, relationships: 50, career: 50 },
          rolledEvent: {
            type: "steady",
            title: "Routine Operations",
            description: "No notable change",
            severity: "neutral",
            statDeltas: { deltaHappiness: 0, deltaHealth: 0, deltaRelationships: 0, deltaCareer: 0 },
            financialImpact: { incomeMultiplier: 1, lumpSumExpense: 0, lumpSumWindfall: 0 },
          },
        },
        {
          quarter: 2,
          month: 6,
          endingSavings: 15000,
          stats: { happiness: 65, health: 50, relationships: 50, career: 65 },
          rolledEvent: {
            type: "promotion",
            title: "Lead Architect",
            description: "Promoted to lead",
            severity: "positive",
            statDeltas: { deltaHappiness: 10, deltaHealth: 0, deltaRelationships: 0, deltaCareer: 15 },
            financialImpact: { incomeMultiplier: 1.2, lumpSumExpense: 0, lumpSumWindfall: 3000 },
          },
        },
      ];

      const events = extractCriticalEvents(steps);
      expect(events).toHaveLength(1);
      expect(events[0]).toBe("M6 Lead Architect");
    });
  });

  describe("Full 12-Timeline Simulation Serialization", () => {
    function generateMockTimeline(
      index: number,
      option: "A" | "B",
      seed: PersonaSeedType
    ): TimelineSummaryInput {
      const steps: TimelineStepSummary[] = [];
      let savings = 20000;
      let happiness = 60;

      for (let q = 1; q <= 20; q++) {
        const month = q * 3;
        savings += option === "A" ? 4500 : 2500;
        happiness = Math.max(25, Math.min(90, happiness + (q % 3 === 0 ? -8 : 4)));

        const isBurnedOut = index === 2 && month >= 18;
        const rolledEvent =
          q === 4
            ? {
                type: "promotion" as const,
                title: "Series A Extension",
                description: "Key milestone reached",
                severity: "positive" as const,
                statDeltas: { deltaHappiness: 8, deltaHealth: -2, deltaRelationships: 0, deltaCareer: 12 },
                financialImpact: { incomeMultiplier: 1.15, lumpSumExpense: 0, lumpSumWindfall: 5000 },
              }
            : q === 12
            ? {
                type: "health_shock" as const,
                title: "Exhaustion Episode",
                description: "Forced medical hiatus",
                severity: "negative" as const,
                statDeltas: { deltaHappiness: -15, deltaHealth: -20, deltaRelationships: 5, deltaCareer: -5 },
                financialImpact: { incomeMultiplier: 0.9, lumpSumExpense: 3000, lumpSumWindfall: 0 },
              }
            : undefined;

        steps.push({
          quarter: q,
          month,
          endingSavings: savings,
          stats: {
            happiness,
            health: Math.max(30, 80 - q),
            relationships: 55,
            career: 50 + q * 2,
          },
          rolledEvent,
          diaryEntry:
            q === 4
              ? "Celebrated funding milestone with the founding team late into the evening."
              : q === 12
              ? "Hit a wall physically after weeks of 70-hour sprints. Realizing the cost."
              : undefined,
          isBurnedOut,
        });
      }

      return {
        timelineId: `tl-${index}`,
        timelineIndex: index,
        branchOption: option,
        branchName: option === "A" ? "London AI Startup" : "Delhi Corporate Lead",
        branchLocation: option === "A" ? "London, UK" : "Delhi, India",
        personaSeed: seed,
        steps,
        finalSavings: savings,
        isBurnedOut: index === 2,
      };
    }

    it("serializes 12 parallel 20-quarter timelines into a dense digest under 2,500 tokens", () => {
      const seeds = ALL_PERSONA_SEEDS;

      const timelines: TimelineSummaryInput[] = [];
      // 6 Path A timelines + 6 Path B timelines = 12 total
      seeds.forEach((seed, i) => {
        timelines.push(generateMockTimeline(i + 1, "A", seed));
      });
      seeds.forEach((seed, i) => {
        timelines.push(generateMockTimeline(i + 7, "B", seed));
      });

      const input: SimulationDigestInput = {
        sessionId: "sess-full-12-test",
        decisionPrompt:
          "Should I move to London to join an early-stage AI startup or remain in Delhi as a Senior Engineering Lead?",
        age: 28,
        currentLocation: "Delhi, India",
        optionA: {
          name: "London AI Startup",
          location: "London, UK",
        },
        optionB: {
          name: "Delhi Corporate Lead",
          location: "Delhi, India",
        },
        corePriorities: ["Financial Autonomy", "Career Velocity", "Family Proximity"],
        timelines,
      };

      const result = serializeSimulationDigest(input);

      // Verify token budget constraints
      expect(result.timelineCount).toBe(12);
      expect(result.tokenEstimate).toBeLessThan(MAX_DIGEST_TOKENS);
      expect(result.isUnderBudget).toBe(true);
      expect(result.tokenEstimate).toBeGreaterThan(400); // Verify it contains rich data

      // Verify required table content
      expect(result.markdown).toContain("# Multiverse Simulation Digest");
      expect(result.markdown).toContain("Reflective Simulation Engine • Not a Future Prediction");
      expect(result.markdown).toContain("London AI Startup");
      expect(result.markdown).toContain("Delhi Corporate Lead");
      expect(result.markdown).toContain("12-Timeline Comparative Matrix");

      // Verify all 12 timeline IDs exist in markdown table
      for (let i = 1; i <= 12; i++) {
        expect(result.markdown).toContain(`| T${i} |`);
      }

      // Verify burnout detection in T2
      expect(result.markdown).toContain("M18");

      // Verify critical event extraction
      expect(result.markdown).toContain("Series A Extension");

      // Verify authentic diary snippets
      expect(result.markdown).toContain("Celebrated funding milestone with the founding team");

      // Verify Anti-AI-Slop compliance on generated markdown
      assertAntiSlopCompliance(result.markdown);
    });
  });
});
