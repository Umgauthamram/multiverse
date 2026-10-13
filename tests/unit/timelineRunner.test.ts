import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  runQuarterStep,
  runTimeline,
  runBatchTimelines,
  TimelineRunConfig,
} from "@/lib/simulation/timelineRunner";
import { QuarterDelta } from "@/lib/ai/agents/lifeAgent";
import { ObjectExecutor, ProviderCandidate } from "@/lib/ai/router";
import { LanguageModel } from "ai";
import { Db, Collection } from "mongodb";

const dummyModel = {
  modelId: "dummy-model",
  provider: "dummy",
} as unknown as LanguageModel;

const dummyModelGetter = () => dummyModel;

const mockChain: ProviderCandidate[] = [
  { name: "groq", getModel: dummyModelGetter },
];

describe("Phase 18: Timeline Orchestrator & Multi-Step Batch Runner", () => {
  let mockStepCollection: Partial<Collection>;
  let mockTimelinesCollection: Partial<Collection>;
  let mockDb: Db;
  let savedQuarterDocs: Record<string, unknown>[];
  let savedTimelineDocs: Record<string, unknown>[];

  beforeEach(() => {
    savedQuarterDocs = [];
    savedTimelineDocs = [];

    mockStepCollection = {
      updateOne: vi.fn(async (filter, update) => {
        savedQuarterDocs.push({ filter, update });
        return { acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0, upsertedId: null };
      }),
    };

    mockTimelinesCollection = {
      updateOne: vi.fn(async (filter, update) => {
        savedTimelineDocs.push({ filter, update });
        return { acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0, upsertedId: null };
      }),
    };

    mockDb = {
      collection: vi.fn((name: string) => {
        if (name === "timelines") return mockTimelinesCollection as Collection;
        return mockStepCollection as Collection;
      }),
    } as unknown as Db;
  });

  const mockDelta: QuarterDelta = {
    quarter: 1,
    deltaHappiness: 4,
    deltaHealth: -2,
    deltaRelationships: -1,
    deltaCareer: 6,
    diaryEntry: "First quarter in the new environment. Stressful yet purposeful.",
    reflection: "Trading immediate comfort for potential steep career growth.",
  };

  const mockExecutor: ObjectExecutor<QuarterDelta> = vi.fn(async ({ prompt }) => {
    const qMatch = prompt.match(/\[Q(\d+)/);
    const q = qMatch ? parseInt(qMatch[1], 10) : 1;
    return {
      object: {
        ...mockDelta,
        quarter: q,
        diaryEntry: `Quarter ${q} diary entry. Pushing through targets.`,
      },
    };
  });

  function getBaseConfig(
    overrides?: Partial<TimelineRunConfig>
  ): TimelineRunConfig {
    return {
      sessionId: "sess-test-101",
      timelineId: "tl-branch-a-1",
      branchOption: "A",
      branchName: "London AI Startup",
      branchLocation: "London, UK",
      personaSeed: "bold",
      decisionPrompt:
        "Should I accept the seed stage AI startup offer in London?",
      initialStats: {
        happiness: 65,
        health: 70,
        relationships: 60,
        career: 75,
      },
      initialLiquidSavings: 30000,
      monthlyIncome: 6000,
      monthlyExpenses: 3000,
      costOfLivingIndex: 1.25,
      db: mockDb,
      persistToDb: true,
      customChain: mockChain,
      executor: mockExecutor,
      ...overrides,
    };
  }

  describe("runQuarterStep", () => {
    it("runs a single quarter step with deterministic math, LLM deltas, and DB persistence", async () => {
      const step = await runQuarterStep({
        sessionId: "sess-test-101",
        timelineId: "tl-branch-a-1",
        branchOption: "A",
        branchName: "London AI Startup",
        branchLocation: "London, UK",
        personaSeed: "bold",
        decisionPrompt: "Should I join London startup?",
        quarter: 1,
        currentStats: { happiness: 65, health: 70, relationships: 60, career: 75 },
        currentSavings: 30000,
        monthlyIncome: 6000,
        monthlyExpenses: 3000,
        costOfLivingIndex: 1.25,
        db: mockDb,
        persistToDb: true,
        customChain: mockChain,
        executor: mockExecutor,
      });

      expect(step.quarter).toBe(1);
      expect(step.month).toBe(3);
      expect(step.startingSavings).toBe(30000);
      expect(step.endingSavings).toBeGreaterThan(0);
      expect(step.stats.happiness).toBeGreaterThanOrEqual(0);
      expect(step.stats.happiness).toBeLessThanOrEqual(100);
      expect(step.diaryEntry).toContain("Quarter 1 diary entry");

      // Verify MongoDB upsert was executed
      expect(mockDb.collection).toHaveBeenCalledWith("timeline_steps");
      expect(mockStepCollection.updateOne).toHaveBeenCalledTimes(1);
      expect(savedQuarterDocs).toHaveLength(1);
      const saved = savedQuarterDocs[0] as { filter: Record<string, unknown> };
      expect(saved.filter).toEqual({
        sessionId: "sess-test-101",
        timelineId: "tl-branch-a-1",
        quarter: 1,
      });
    });
  });

  describe("runTimeline (5-Step Mock CI Integration)", () => {
    it("executes 5 quarters sequentially, carrying forward savings and stats, persisting to DB", async () => {
      const stepEvents: number[] = [];
      const onStepComplete = vi.fn((step) => {
        stepEvents.push(step.quarter);
      });

      const summary = await runTimeline(
        getBaseConfig({
          startQuarter: 1,
          endQuarter: 5,
          onStepComplete,
        })
      );

      // Assert step sequence
      expect(stepEvents).toEqual([1, 2, 3, 4, 5]);
      expect(onStepComplete).toHaveBeenCalledTimes(5);
      expect(summary.totalQuartersCompleted).toBe(5);
      expect(summary.steps).toHaveLength(5);

      // Verify state propagation across quarters
      for (let i = 1; i < summary.steps.length; i++) {
        const prevStep = summary.steps[i - 1];
        const currStep = summary.steps[i];
        expect(currStep.startingSavings).toBe(prevStep.endingSavings);
      }

      // Assert MongoDB persistence
      expect(savedQuarterDocs).toHaveLength(5);
      expect(savedTimelineDocs).toHaveLength(1);
      const timelineSaved = savedTimelineDocs[0] as {
        filter: Record<string, unknown>;
        update: { $set: Record<string, unknown> };
      };
      expect(timelineSaved.filter).toEqual({
        sessionId: "sess-test-101",
        timelineId: "tl-branch-a-1",
      });
      expect(timelineSaved.update.$set.totalQuartersCompleted).toBe(5);
    });
  });

  describe("runBatchTimelines (Parallel Batch Execution)", () => {
    it("runs multiple parallel timelines with concurrency throttling", async () => {
      const config1: TimelineRunConfig = getBaseConfig({
        timelineId: "tl-1",
        personaSeed: "bold",
        startQuarter: 1,
        endQuarter: 3,
      });

      const config2: TimelineRunConfig = getBaseConfig({
        timelineId: "tl-2",
        personaSeed: "anxious",
        startQuarter: 1,
        endQuarter: 3,
      });

      const config3: TimelineRunConfig = getBaseConfig({
        timelineId: "tl-3",
        personaSeed: "balanced",
        startQuarter: 1,
        endQuarter: 3,
      });

      const summaries = await runBatchTimelines(
        [config1, config2, config3],
        { concurrency: 2 }
      );

      expect(summaries).toHaveLength(3);
      expect(summaries[0].timelineId).toBe("tl-1");
      expect(summaries[1].timelineId).toBe("tl-2");
      expect(summaries[2].timelineId).toBe("tl-3");
      expect(summaries[0].steps).toHaveLength(3);
      expect(summaries[1].steps).toHaveLength(3);
      expect(summaries[2].steps).toHaveLength(3);
    });
  });
});
