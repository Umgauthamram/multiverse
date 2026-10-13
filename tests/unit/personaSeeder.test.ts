import { describe, it, expect } from "vitest";
import {
  ALL_PERSONA_SEEDS,
  getPersonaSeedProfile,
  listAllPersonaSeeds,
  generate12TimelineSeeds,
  validateTimelineBranches,
  GenerateTimelineSeedsInput,
} from "@/lib/simulation/personaSeeder";

describe("Phase 15: Persona Seed Generator for 12 Timelines", () => {
  const sampleInput: GenerateTimelineSeedsInput = {
    sessionId: "session_test_99",
    optionA: {
      name: "London AI Startup",
      location: "London, UK",
      description: "Join high-risk seed startup as founding engineer",
    },
    optionB: {
      name: "Delhi Corporate Lead",
      location: "Delhi, India",
      description: "Stay in stable Tier-1 corporate role with close family proximity",
    },
    liquidSavings: 30000,
    monthlyBurn: 2000,
  };

  describe("Persona Archetypes Catalog", () => {
    it("contains exactly 6 distinct behavioral seeds", () => {
      expect(ALL_PERSONA_SEEDS).toHaveLength(6);
      expect(ALL_PERSONA_SEEDS).toEqual([
        "bold",
        "anxious",
        "workaholic",
        "balanced",
        "pragmatist",
        "burnout_risk",
      ]);
    });

    it("ensures each persona profile has complete behavioral parameters", () => {
      ALL_PERSONA_SEEDS.forEach((seed) => {
        const profile = getPersonaSeedProfile(seed);
        expect(profile).toBeDefined();
        expect(profile.id).toBe(seed);
        expect(typeof profile.label).toBe("string");
        expect(typeof profile.archetype).toBe("string");
        expect(typeof profile.description).toBe("string");

        // Behavioral modifiers
        expect(profile.behavioralModifiers.riskTolerance).toBeGreaterThanOrEqual(0);
        expect(profile.behavioralModifiers.riskTolerance).toBeLessThanOrEqual(1);
        expect(profile.behavioralModifiers.workloadIntensity).toBeGreaterThanOrEqual(0);
        expect(profile.behavioralModifiers.workloadIntensity).toBeLessThanOrEqual(1);
        expect(profile.behavioralModifiers.socialExpenditure).toBeGreaterThanOrEqual(0);
        expect(profile.behavioralModifiers.socialExpenditure).toBeLessThanOrEqual(1);

        // Stat bias
        expect(profile.quarterlyStatBias).toBeDefined();
        expect(typeof profile.quarterlyStatBias.deltaHappiness).toBe("number");
        expect(typeof profile.quarterlyStatBias.deltaHealth).toBe("number");
        expect(typeof profile.quarterlyStatBias.deltaRelationships).toBe("number");
        expect(typeof profile.quarterlyStatBias.deltaCareer).toBe("number");
      });
    });

    it("lists all 6 persona profiles via listAllPersonaSeeds()", () => {
      const all = listAllPersonaSeeds();
      expect(all).toHaveLength(6);
      expect(all.map((p) => p.id)).toEqual(ALL_PERSONA_SEEDS);
    });
  });

  describe("12 Timeline Branches Generation", () => {
    it("generates an exact 12-branch split (6 in Path A, 6 in Path B)", () => {
      const branches = generate12TimelineSeeds(sampleInput);

      expect(branches).toHaveLength(12);

      const pathABranches = branches.filter((b) => b.branchOption === "A");
      const pathBBranches = branches.filter((b) => b.branchOption === "B");

      expect(pathABranches).toHaveLength(6);
      expect(pathBBranches).toHaveLength(6);
    });

    it("assigns each of the 6 unique persona seeds to both Option A and Option B", () => {
      const branches = generate12TimelineSeeds(sampleInput);

      const pathASeeds = branches
        .filter((b) => b.branchOption === "A")
        .map((b) => b.personaSeed);
      const pathBSeeds = branches
        .filter((b) => b.branchOption === "B")
        .map((b) => b.personaSeed);

      expect(pathASeeds.sort()).toEqual([...ALL_PERSONA_SEEDS].sort());
      expect(pathBSeeds.sort()).toEqual([...ALL_PERSONA_SEEDS].sort());
    });

    it("ensures all 12 timeline IDs and random seeds are globally unique", () => {
      const branches = generate12TimelineSeeds(sampleInput);

      const timelineIds = branches.map((b) => b.timelineId);
      const uniqueIds = new Set(timelineIds);
      expect(uniqueIds.size).toBe(12);

      const randomSeeds = branches.map((b) => b.seedRandom);
      const uniqueRandomSeeds = new Set(randomSeeds);
      expect(uniqueRandomSeeds.size).toBe(12);
    });

    it("properly initializes initial financial and stat baselines", () => {
      const branches = generate12TimelineSeeds({
        ...sampleInput,
        baselineStats: {
          happiness: 80,
          health: 75,
        },
      });

      branches.forEach((b) => {
        expect(b.initialLiquidSavings).toBe(30000);
        expect(b.initialMonthlyBurn).toBe(2000);
        expect(b.initialStats.happiness).toBe(80);
        expect(b.initialStats.health).toBe(75);
        expect(b.status).toBe("active");
        if (b.branchOption === "A") {
          expect(b.branchName).toBe("London AI Startup");
          expect(b.branchLocation).toBe("London, UK");
        } else {
          expect(b.branchName).toBe("Delhi Corporate Lead");
          expect(b.branchLocation).toBe("Delhi, India");
        }
      });
    });
  });

  describe("validateTimelineBranches Verification", () => {
    it("confirms generated 12-branch set is structurally valid", () => {
      const branches = generate12TimelineSeeds(sampleInput);
      const validation = validateTimelineBranches(branches);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("detects and flags imbalanced branches or missing seeds", () => {
      const branches = generate12TimelineSeeds(sampleInput);
      // Remove one branch from Option A
      const corrupted = branches.filter(
        (b) => !(b.branchOption === "A" && b.personaSeed === "bold")
      );

      const validation = validateTimelineBranches(corrupted);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("Expected 12 branches"))).toBe(true);
      expect(validation.errors.some((e) => e.includes('missing seed "bold"'))).toBe(true);
    });

    it("detects duplicate timeline IDs", () => {
      const branches = generate12TimelineSeeds(sampleInput);
      // Introduce duplicate ID
      const duplicated = branches.map((b, idx) =>
        idx === 1 ? { ...b, timelineId: branches[0].timelineId } : b
      );

      const validation = validateTimelineBranches(duplicated);
      expect(validation.valid).toBe(false);
      expect(
        validation.errors.some((e) => e.includes("Timeline IDs are not unique"))
      ).toBe(true);
    });
  });
});
