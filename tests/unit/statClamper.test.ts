import { describe, it, expect } from "vitest";
import {
  clampStat,
  applyAndClampStats,
  computeCompositeScore,
  LifeStats,
} from "@/lib/simulation/statClamper";

describe("Phase 10: Statistical Clamping & Burnout Invariant Engine", () => {
  describe("clampStat", () => {
    it("safely clamps negative values to 0", () => {
      expect(clampStat(-50)).toBe(0);
      expect(clampStat(-0.01)).toBe(0);
      expect(clampStat(-1000)).toBe(0);
    });

    it("safely clamps values exceeding 100 to 100", () => {
      expect(clampStat(101)).toBe(100);
      expect(clampStat(250)).toBe(100);
      expect(clampStat(99999)).toBe(100);
    });

    it("preserves valid values between 0 and 100", () => {
      expect(clampStat(0)).toBe(0);
      expect(clampStat(50)).toBe(50);
      expect(clampStat(100)).toBe(100);
      expect(clampStat(74.6)).toBe(75);
    });

    it("handles non-finite or NaN values with safe fallback", () => {
      expect(clampStat(NaN)).toBe(50);
      expect(clampStat(Infinity)).toBe(50);
      expect(clampStat(-Infinity)).toBe(50);
    });
  });

  describe("applyAndClampStats", () => {
    const baseStats: LifeStats = {
      happiness: 60,
      health: 70,
      relationships: 65,
      career: 55,
    };

    it("applies positive and negative deltas while strictly clamping to [0, 100]", () => {
      const result = applyAndClampStats(baseStats, {
        deltaHappiness: +15, // 60 -> 75
        deltaHealth: -20, // 70 -> 50
        deltaRelationships: +50, // 65 + 50 -> clamped to 100
        deltaCareer: -80, // 55 - 80 -> clamped to 0
      });

      expect(result.stats.happiness).toBe(75);
      expect(result.stats.health).toBe(50);
      expect(result.stats.relationships).toBe(100);
      expect(result.stats.career).toBe(0);
    });

    it("triggers burnout state when health and happiness collapse", () => {
      const result = applyAndClampStats(
        { happiness: 20, health: 18, relationships: 40, career: 80 },
        { deltaHappiness: -5, deltaHealth: -5 }
      );

      expect(result.isBurnout).toBe(true);
      expect(result.burnoutSeverity).toBe("critical");
      expect(result.status).toBe("burnout");
    });

    it("assigns thriving status when all primary metrics are high", () => {
      const result = applyAndClampStats(
        { happiness: 75, health: 70, relationships: 65, career: 70 },
        { deltaHappiness: +5, deltaHealth: +5 }
      );

      expect(result.isThriving).toBe(true);
      expect(result.isBurnout).toBe(false);
      expect(result.status).toBe("thriving");
    });

    it("assigns struggling status when happiness or health drops below 35", () => {
      const result = applyAndClampStats(
        baseStats,
        { deltaHappiness: -35 } // 60 -> 25
      );

      expect(result.status).toBe("struggling");
      expect(result.isBurnout).toBe(false);
    });

    it("computes weighted composite score honoring user priorities", () => {
      const stats: LifeStats = {
        happiness: 90,
        health: 50,
        relationships: 40,
        career: 40,
      };

      // Default equal weighting: (90 + 50 + 40 + 40) / 4 = 55
      const equalScore = computeCompositeScore(stats);
      expect(equalScore).toBe(55);

      // Heavy weighting on happiness (3x): (90*3 + 50 + 40 + 40) / 6 = 400 / 6 = 67
      const happinessHeavy = computeCompositeScore(stats, { happiness: 3.0 });
      expect(happinessHeavy).toBe(67);
    });
  });

  describe("Property-based randomized edge-case testing", () => {
    it("maintains strict invariants over 100 wild delta applications", () => {
      for (let i = 0; i < 100; i++) {
        const initial: LifeStats = {
          happiness: Math.floor(Math.random() * 101),
          health: Math.floor(Math.random() * 101),
          relationships: Math.floor(Math.random() * 101),
          career: Math.floor(Math.random() * 101),
        };

        const randomDeltas = {
          deltaHappiness: Math.floor(Math.random() * 401) - 200, // [-200, +200]
          deltaHealth: Math.floor(Math.random() * 401) - 200,
          deltaRelationships: Math.floor(Math.random() * 401) - 200,
          deltaCareer: Math.floor(Math.random() * 401) - 200,
        };

        const result = applyAndClampStats(initial, randomDeltas);

        // Invariant 1: All metrics strictly inside [0, 100]
        expect(result.stats.happiness).toBeGreaterThanOrEqual(0);
        expect(result.stats.happiness).toBeLessThanOrEqual(100);
        expect(result.stats.health).toBeGreaterThanOrEqual(0);
        expect(result.stats.health).toBeLessThanOrEqual(100);
        expect(result.stats.relationships).toBeGreaterThanOrEqual(0);
        expect(result.stats.relationships).toBeLessThanOrEqual(100);
        expect(result.stats.career).toBeGreaterThanOrEqual(0);
        expect(result.stats.career).toBeLessThanOrEqual(100);

        // Invariant 2: Composite score inside [0, 100]
        expect(result.compositeLifeScore).toBeGreaterThanOrEqual(0);
        expect(result.compositeLifeScore).toBeLessThanOrEqual(100);

        // Invariant 3: Valid status label
        expect(["thriving", "plateau", "struggling", "burnout"]).toContain(result.status);
      }
    });
  });
});
