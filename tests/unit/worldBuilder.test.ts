import { describe, it, expect, vi } from "vitest";
import {
  WorldCastSchema,
  generateWorldCast,
  WorldCast,
  WorldBuilderInput,
} from "@/lib/ai/agents/worldBuilder";
import { ObjectExecutor, ProviderCandidate } from "@/lib/ai/router";
import { LanguageModel } from "ai";

const dummyModel = {
  modelId: "dummy-model",
  provider: "dummy",
} as unknown as LanguageModel;

const dummyModelGetter = () => dummyModel;

describe("Phase 14: World-Builder Agent (NVIDIA NIM & Router Fallback)", () => {
  const sampleValidCast: WorldCast = {
    cast: [
      {
        id: "char-1",
        name: "Ananya Sharma",
        role: "partner",
        archetype: "Grounded Realist",
        personality: "Thoughtful and cautious about long-distance disruptions, but deeply supportive.",
        relationshipContext: "Partner of 4 years currently working in design in Bengaluru.",
        stakeInDilemma: "Wonders if relocating to London is viable for her own career or if it risks estrangement.",
      },
      {
        id: "char-2",
        name: "Marcus Vance",
        role: "manager",
        archetype: "Demanding Mentor",
        personality: "High-octane founding CEO with relentless expectations and infectious optimism.",
        relationshipContext: "Prospective manager and co-founder at the London AI startup.",
        stakeInDilemma: "Needs a technical pillar who can ship without hand-holding; betting the seed round on this hire.",
      },
      {
        id: "char-3",
        name: "Rajesh Iyer",
        role: "mentor",
        archetype: "Corporate Veteran",
        personality: "Calm, politically savvy, prioritizes stability, compounding savings, and title momentum.",
        relationshipContext: "Senior Director at the Delhi enterprise firm.",
        stakeInDilemma: "Advocates staying for the impending promotion cycle, warning against startup mortality.",
      },
      {
        id: "char-4",
        name: "Karan Mehta",
        role: "friend",
        archetype: "Ambitious Catalyst",
        personality: "Restless entrepreneur who believes staying in corporate roles breeds regret.",
        relationshipContext: "College batchmate who moved overseas two years ago.",
        stakeInDilemma: "Strongly pushes the protagonist to take the leap to London while young.",
      },
    ],
  };

  const sampleInput: WorldBuilderInput = {
    age: 26,
    currentLocation: "Bengaluru, India",
    decisionPrompt:
      "Should I accept an early-stage founding engineer offer in London, or stay in my stable corporate tech lead role in Delhi?",
    optionA: {
      name: "London AI Startup",
      location: "London, UK",
      description: "Join high-risk seed AI startup as founding engineer.",
    },
    optionB: {
      name: "Delhi Corporate Lead",
      location: "Delhi, India",
      description: "Stay in stable Tier-1 tech company with predictable promotions.",
    },
    corePriorities: ["career", "wealth"],
  };

  const mockChain: ProviderCandidate[] = [
    { name: "nvidia", getModel: dummyModelGetter },
    { name: "gemini", getModel: dummyModelGetter },
    { name: "groq", getModel: dummyModelGetter },
  ];

  describe("WorldCastSchema Validation", () => {
    it("validates a well-formed cast of 3 to 5 characters", () => {
      const result = WorldCastSchema.safeParse(sampleValidCast);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cast).toHaveLength(4);
        expect(result.data.cast[0].role).toBe("partner");
        expect(result.data.cast[1].role).toBe("manager");
      }
    });

    it("rejects cast with fewer than 3 characters", () => {
      const underMinimum: WorldCast = {
        cast: sampleValidCast.cast.slice(0, 2),
      };
      const result = WorldCastSchema.safeParse(underMinimum);
      expect(result.success).toBe(false);
    });

    it("rejects cast with more than 5 characters", () => {
      const overMaximum: WorldCast = {
        cast: [
          ...sampleValidCast.cast,
          {
            id: "char-5",
            name: "David Kim",
            role: "colleague",
            archetype: "Pragmatist",
            personality: "Analytical peer who analyzes tradeoffs mathematically.",
            relationshipContext: "Peer engineer at current firm.",
            stakeInDilemma: "Weighing workload distribution if protagonist leaves.",
          },
          {
            id: "char-6",
            name: "Pooja Patel",
            role: "friend",
            archetype: "Observer",
            personality: "Supportive childhood friend offering unbiased sounding board.",
            relationshipContext: "Close friend outside tech.",
            stakeInDilemma: "Worries about protagonist's work-life balance and health.",
          },
        ],
      };
      const result = WorldCastSchema.safeParse(overMaximum);
      expect(result.success).toBe(false);
    });

    it("rejects invalid role strings", () => {
      const invalidRole = {
        cast: [
          ...sampleValidCast.cast.slice(0, 3),
          {
            ...sampleValidCast.cast[0],
            id: "char-invalid",
            role: "superhero", // Invalid role
          },
        ],
      };
      const result = WorldCastSchema.safeParse(invalidRole);
      expect(result.success).toBe(false);
    });
  });

  describe("generateWorldCast Agent Execution", () => {
    it("generates cast using injected executor matching NVIDIA NIM role", async () => {
      let capturedPrompt = "";
      const mockExecutor: ObjectExecutor<WorldCast> = vi.fn(
        async ({ prompt }) => {
          capturedPrompt = prompt;
          return { object: sampleValidCast };
        }
      );

      const output = await generateWorldCast({
        ...sampleInput,
        customChain: mockChain,
        executor: mockExecutor,
      });

      expect(mockExecutor).toHaveBeenCalledTimes(1);
      expect(output.cast).toHaveLength(4);
      expect(output.cast[0].name).toBe("Ananya Sharma");
      expect(output.telemetry.provider).toBe("nvidia");
      expect(output.telemetry.fallbackCount).toBe(0);

      // Verify prompt inclusion
      expect(capturedPrompt).toContain("26");
      expect(capturedPrompt).toContain("Bengaluru, India");
      expect(capturedPrompt).toContain("London AI Startup");
      expect(capturedPrompt).toContain("Delhi Corporate Lead");
    });

    it("transparently fails over to Gemini/Groq when primary provider fails", async () => {
      let attempts = 0;
      const failingMockExecutor: ObjectExecutor<WorldCast> = vi.fn(
        async () => {
          attempts++;
          if (attempts === 1) {
            throw new Error("HTTP 429: NVIDIA NIM rate limit reached");
          }
          return { object: sampleValidCast };
        }
      );

      const output = await generateWorldCast({
        ...sampleInput,
        customChain: mockChain,
        executor: failingMockExecutor,
      });

      expect(attempts).toBe(2);
      expect(output.cast).toHaveLength(4);
      expect(output.telemetry.fallbackCount).toBe(1);
      expect(output.telemetry.provider).toBe("gemini");
    });
  });
});
