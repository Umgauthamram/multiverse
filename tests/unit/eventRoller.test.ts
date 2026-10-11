import { describe, it, expect } from "vitest";
import {
  createPrng,
  hashStringToSeed,
  normalizeProbabilities,
  rollEventType,
  rollQuarterEvent,
  rollTimelineEvents,
  simulateDistribution,
  DEFAULT_EVENT_PROBABILITIES,
  LifeEventType,
} from "@/lib/simulation/eventRoller";

describe("Phase 11: Weighted Random Life Event Roller", () => {
  describe("Deterministic PRNG & Hash", () => {
    it("converts string seeds to deterministic 32-bit integers", () => {
      const h1 = hashStringToSeed("timeline-alpha");
      const h2 = hashStringToSeed("timeline-alpha");
      const h3 = hashStringToSeed("timeline-beta");

      expect(h1).toBe(h2);
      expect(typeof h1).toBe("number");
      expect(h1).toBeGreaterThan(0);
      expect(h1).not.toBe(h3);
    });

    it("produces identical pseudorandom float sequences for identical seeds", () => {
      const prng1 = createPrng("seed-42");
      const prng2 = createPrng("seed-42");

      const seq1 = Array.from({ length: 10 }, () => prng1());
      const seq2 = Array.from({ length: 10 }, () => prng2());

      expect(seq1).toEqual(seq2);
      seq1.forEach((val) => {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      });
    });

    it("produces diverging pseudorandom sequences for different seeds", () => {
      const prng1 = createPrng(12345);
      const prng2 = createPrng(98765);

      const seq1 = Array.from({ length: 10 }, () => prng1());
      const seq2 = Array.from({ length: 10 }, () => prng2());

      expect(seq1).not.toEqual(seq2);
    });
  });

  describe("Probability Normalization", () => {
    it("returns default probabilities summing exactly to 1.0 when no overrides are given", () => {
      const p = normalizeProbabilities();
      expect(p).toEqual(DEFAULT_EVENT_PROBABILITIES);
      const sum =
        p.promotion +
        p.layoff +
        p.health_shock +
        p.windfall +
        p.serendipity +
        p.steady;
      expect(sum).toBeCloseTo(1.0, 5);
      expect(p.promotion).toBe(0.12);
      expect(p.layoff).toBe(0.08);
      expect(p.health_shock).toBe(0.04);
      expect(p.windfall).toBe(0.01);
      expect(p.serendipity).toBe(0.06);
      expect(p.steady).toBe(0.69);
    });

    it("normalizes custom probabilities to sum to 1.0", () => {
      const p = normalizeProbabilities({
        promotion: 50,
        layoff: 50,
        health_shock: 0,
        windfall: 0,
        serendipity: 0,
        steady: 0,
      });

      expect(p.promotion).toBeCloseTo(0.5, 4);
      expect(p.layoff).toBeCloseTo(0.5, 4);
      expect(p.health_shock).toBe(0);
      expect(p.windfall).toBe(0);
      expect(p.serendipity).toBe(0);
      expect(p.steady).toBe(0);
    });

    it("falls back to default probabilities if total is zero", () => {
      const p = normalizeProbabilities({
        promotion: 0,
        layoff: 0,
        health_shock: 0,
        windfall: 0,
        serendipity: 0,
        steady: 0,
      });
      expect(p).toEqual(DEFAULT_EVENT_PROBABILITIES);
    });
  });

  describe("Deterministic Event Rolling", () => {
    it("determines deterministic event type given fixed roll thresholds", () => {
      // Promotion: [0, 0.12)
      expect(rollEventType(() => 0.05)).toBe("promotion");
      // Layoff: [0.12, 0.20)
      expect(rollEventType(() => 0.15)).toBe("layoff");
      // Health Shock: [0.20, 0.24)
      expect(rollEventType(() => 0.22)).toBe("health_shock");
      // Windfall: [0.24, 0.25)
      expect(rollEventType(() => 0.245)).toBe("windfall");
      // Serendipity: [0.25, 0.31)
      expect(rollEventType(() => 0.28)).toBe("serendipity");
      // Steady: [0.31, 1.0)
      expect(rollEventType(() => 0.50)).toBe("steady");
      expect(rollEventType(() => 0.99)).toBe("steady");
    });

    it("generates identical quarter events for identical seeds and quarter indices", () => {
      const event1 = rollQuarterEvent({
        seed: "user-session-101",
        quarterIndex: 4,
        timelineId: "timeline-01",
      });
      const event2 = rollQuarterEvent({
        seed: "user-session-101",
        quarterIndex: 4,
        timelineId: "timeline-01",
      });

      expect(event1).toEqual(event2);
      expect(event1.quarterIndex).toBe(4);
      expect(event1.timelineId).toBe("timeline-01");
    });

    it("generates a complete 20-quarter timeline deterministically", () => {
      const timelineA = rollTimelineEvents("branch-path-a-seed", 20);
      const timelineB = rollTimelineEvents("branch-path-a-seed", 20);

      expect(timelineA).toHaveLength(20);
      expect(timelineB).toHaveLength(20);
      expect(timelineA).toEqual(timelineB);

      // Verify each event conforms to LifeEvent schema
      const allTypes: LifeEventType[] = [
        "promotion",
        "layoff",
        "health_shock",
        "windfall",
        "serendipity",
        "steady",
      ];
      timelineA.forEach((ev, idx) => {
        expect(ev.quarterIndex).toBe(idx);
        expect(allTypes).toContain(ev.type);
        expect(typeof ev.title).toBe("string");
        expect(typeof ev.description).toBe("string");
        expect(ev.statDeltas).toBeDefined();
        expect(ev.financialImpact).toBeDefined();
      });
    });

    it("enforces specific financial and stat deltas per event type", () => {
      const layoff = rollQuarterEvent({ rng: () => 0.15 });
      expect(layoff.type).toBe("layoff");
      expect(layoff.severity).toBe("negative");
      expect(layoff.financialImpact.incomeMultiplier).toBe(0.0);
      expect(layoff.statDeltas.deltaCareer).toBeLessThan(0);

      const promotion = rollQuarterEvent({ rng: () => 0.05 });
      expect(promotion.type).toBe("promotion");
      expect(promotion.severity).toBe("positive");
      expect(promotion.financialImpact.incomeMultiplier).toBeGreaterThan(1.0);
      expect(promotion.statDeltas.deltaCareer).toBeGreaterThan(0);

      const healthShock = rollQuarterEvent({ rng: () => 0.22 });
      expect(healthShock.type).toBe("health_shock");
      expect(healthShock.severity).toBe("negative");
      expect(healthShock.financialImpact.lumpSumExpense).toBeGreaterThan(0);
      expect(healthShock.statDeltas.deltaHealth).toBeLessThan(0);

      const windfall = rollQuarterEvent({ rng: () => 0.245 });
      expect(windfall.type).toBe("windfall");
      expect(windfall.severity).toBe("positive");
      expect(windfall.financialImpact.lumpSumWindfall).toBeGreaterThan(0);

      const serendipity = rollQuarterEvent({ rng: () => 0.28 });
      expect(serendipity.type).toBe("serendipity");
      expect(serendipity.severity).toBe("positive");
      expect(serendipity.statDeltas.deltaRelationships).toBeGreaterThan(10);
    });
  });

  describe("Monte Carlo Statistical Distribution (10,000 Quarters)", () => {
    it("asserts 10,000 simulated quarters match target probabilities within 2% margin", () => {
      const trials = 10000;
      const seed = "multiverse-monte-carlo-test-seed";
      const stats = simulateDistribution(trials, seed);

      const allowedMargin = 0.02; // 2% tolerance as mandated by WORKLOAD_30_PHASES.md

      const types: LifeEventType[] = [
        "promotion",
        "layoff",
        "health_shock",
        "windfall",
        "serendipity",
        "steady",
      ];

      types.forEach((type) => {
        const { frequency, target, delta, count } = stats[type];
        // Target checks:
        // promotion: 12% target -> 10% to 14%
        // layoff: 8% target -> 6% to 10%
        // health_shock: 4% target -> 2% to 6%
        // windfall: 1% target -> 0% to 3%
        // serendipity: 6% target -> 4% to 8%
        // steady: 69% target -> 67% to 71%
        expect(delta).toBeLessThanOrEqual(allowedMargin);
        expect(count).toBeGreaterThan(0);
        expect(frequency).toBeGreaterThanOrEqual(Math.max(0, target - allowedMargin));
        expect(frequency).toBeLessThanOrEqual(target + allowedMargin);
      });
    });

    it("verifies unseeded rolls also respect statistical distributions over 10,000 trials", () => {
      const trials = 10000;
      const stats = simulateDistribution(trials);

      const allowedMargin = 0.02;

      expect(stats.promotion.delta).toBeLessThanOrEqual(allowedMargin);
      expect(stats.layoff.delta).toBeLessThanOrEqual(allowedMargin);
      expect(stats.health_shock.delta).toBeLessThanOrEqual(allowedMargin);
      expect(stats.windfall.delta).toBeLessThanOrEqual(allowedMargin);
      expect(stats.serendipity.delta).toBeLessThanOrEqual(allowedMargin);
      expect(stats.steady.delta).toBeLessThanOrEqual(allowedMargin);
    });
  });
});
