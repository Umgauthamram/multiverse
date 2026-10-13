import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  SimulationDocumentSchema,
  TimelineStepDocumentSchema,
  ensureSimulationIndexes,
  SIMULATION_INDEXES,
  TIMELINE_INDEXES,
  TIMELINE_STEP_INDEXES,
  createSimulation,
  getSimulationBySessionId,
  updateSimulationStatus,
  benchmarkStepRetrieval,
  TimelineStepDocument,
  CreateSimulationInput,
} from "@/lib/db/models/Simulation";
import { Db, Collection, ObjectId, Filter } from "mongodb";

describe("Phase 20: MongoDB Simulation Model & Indexing Strategy", () => {
  let mockSimCol: Collection;
  let mockTimelineCol: Collection;
  let mockStepCol: Collection;
  let mockDb: Db;

  const sampleSimulationInput: CreateSimulationInput = {
    sessionId: "sess-model-1",
    userId: "usr-tester-42",
    decisionPrompt:
      "Should I accept the seed stage AI startup offer in London or stay in Delhi?",
    age: 27,
    currentLocation: "Bengaluru, India",
    optionA: {
      name: "London AI Startup",
      location: "London, UK",
      description: "Founding engineer role",
    },
    optionB: {
      name: "Delhi Corporate Lead",
      location: "Delhi, India",
      description: "Stable Tier-1 enterprise role",
    },
    corePriorities: ["career", "wealth"],
    status: "pending",
    totalTimelines: 12,
    completedTimelines: 0,
  };

  beforeEach(() => {
    vi.restoreAllMocks();

    mockSimCol = {
      createIndexes: vi.fn().mockResolvedValue(["uniq_sessionId", "idx_userId_createdAt", "idx_status_createdAt"]),
      insertOne: vi.fn().mockResolvedValue({ acknowledged: true, insertedId: new ObjectId() }),
      findOne: vi.fn().mockImplementation(async (filter?: Filter<Document>) => ({
        ...sampleSimulationInput,
        sessionId: (filter as { sessionId?: string } | undefined)?.sessionId || "sess-model-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      updateOne: vi.fn().mockResolvedValue({
        acknowledged: true,
        matchedCount: 1,
        modifiedCount: 1,
        upsertedCount: 0,
        upsertedId: null,
      }),
    } as unknown as Collection;

    mockTimelineCol = {
      createIndexes: vi.fn().mockResolvedValue(["uniq_sessionId_timelineId", "idx_sessionId_branchOption"]),
    } as unknown as Collection;

    mockStepCol = {
      createIndexes: vi.fn().mockResolvedValue([
        "uniq_sessionId_timelineId_quarter",
        "idx_sessionId_quarter",
        "idx_sessionId_timelineId_month",
      ]),
      find: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([]),
      }),
    } as unknown as Collection;

    mockDb = {
      collection: vi.fn((name: string) => {
        if (name === "simulations") return mockSimCol as Collection;
        if (name === "timelines") return mockTimelineCol as Collection;
        return mockStepCol as Collection;
      }),
    } as unknown as Db;
  });

  describe("Schema Validation", () => {
    it("validates a compliant simulation document", () => {
      const parsed = SimulationDocumentSchema.safeParse(sampleSimulationInput);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.sessionId).toBe("sess-model-1");
        expect(parsed.data.status).toBe("pending");
      }
    });

    it("rejects simulation with age under 18", () => {
      const invalid = { ...sampleSimulationInput, age: 16 };
      const parsed = SimulationDocumentSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });

    it("rejects simulation with invalid status string", () => {
      const invalid = { ...sampleSimulationInput, status: "in_progress" };
      const parsed = SimulationDocumentSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });

    it("validates a quarterly step document and enforces quarter in range 1..20", () => {
      const validStep: TimelineStepDocument = {
        sessionId: "sess-model-1",
        timelineId: "tl-1",
        branchOption: "A",
        branchName: "London Startup",
        branchLocation: "London, UK",
        personaSeed: "bold",
        quarter: 15,
        month: 45,
        startingSavings: 50000,
        endingSavings: 56000,
        netWorthDelta: 6000,
        monthlyIncome: 7000,
        monthlyBurn: 3500,
        stats: { happiness: 75, health: 68, relationships: 62, career: 88 },
        statDeltas: { deltaHappiness: 2, deltaHealth: -1, deltaRelationships: 0, deltaCareer: 5 },
        rolledEvent: {
          type: "promotion",
          title: "Principal Architect",
          description: "Scaled org",
          severity: "positive",
          statDeltas: { deltaHappiness: 3, deltaHealth: 0, deltaRelationships: 0, deltaCareer: 8 },
          financialImpact: { incomeMultiplier: 1.2, lumpSumExpense: 0, lumpSumWindfall: 5000 },
        },
        diaryEntry: "Taking leadership helm across two product divisions.",
        reflection: "Significant autonomy gained.",
        isBurnedOut: false,
        status: "active",
        recordedAt: new Date(),
      };

      expect(TimelineStepDocumentSchema.safeParse(validStep).success).toBe(true);

      const invalidQuarter = { ...validStep, quarter: 21 };
      expect(TimelineStepDocumentSchema.safeParse(invalidQuarter).success).toBe(false);
    });
  });

  describe("Compound Index Strategy", () => {
    it("defines high-performance compound and unique indexes for all collections", () => {
      // Assert simulations index keys
      expect(SIMULATION_INDEXES.some((idx) => idx.name === "uniq_sessionId" && idx.unique)).toBe(true);
      expect(SIMULATION_INDEXES.some((idx) => idx.name === "idx_userId_createdAt")).toBe(true);
      expect(SIMULATION_INDEXES.some((idx) => idx.name === "idx_status_createdAt")).toBe(true);

      // Assert timeline indexes
      expect(TIMELINE_INDEXES.some((idx) => idx.name === "uniq_sessionId_timelineId" && idx.unique)).toBe(true);
      expect(TIMELINE_INDEXES.some((idx) => idx.name === "idx_sessionId_branchOption")).toBe(true);

      // Assert timeline steps indexes
      expect(TIMELINE_STEP_INDEXES.some((idx) => idx.name === "uniq_sessionId_timelineId_quarter" && idx.unique)).toBe(true);
      expect(TIMELINE_STEP_INDEXES.some((idx) => idx.name === "idx_sessionId_quarter")).toBe(true);
      expect(TIMELINE_STEP_INDEXES.some((idx) => idx.name === "idx_sessionId_timelineId_month")).toBe(true);
    });

    it("ensures all indexes are created across collections", async () => {
      const report = await ensureSimulationIndexes(mockDb);

      expect(mockSimCol.createIndexes).toHaveBeenCalledWith(SIMULATION_INDEXES);
      expect(mockTimelineCol.createIndexes).toHaveBeenCalledWith(TIMELINE_INDEXES);
      expect(mockStepCol.createIndexes).toHaveBeenCalledWith(TIMELINE_STEP_INDEXES);

      expect(report.simulationsIndexes).toContain("uniq_sessionId");
      expect(report.timelinesIndexes).toContain("uniq_sessionId_timelineId");
      expect(report.stepsIndexes).toContain("uniq_sessionId_timelineId_quarter");
    });
  });

  describe("Model CRUD Helpers", () => {
    it("creates a simulation document and persists to database", async () => {
      const doc = await createSimulation(sampleSimulationInput, mockDb);
      expect(doc.sessionId).toBe("sess-model-1");
      expect(mockSimCol.insertOne).toHaveBeenCalledWith(doc);
    });

    it("retrieves a simulation by sessionId", async () => {
      const doc = await getSimulationBySessionId("sess-model-1", mockDb);
      expect(doc).not.toBeNull();
      expect(doc?.sessionId).toBe("sess-model-1");
      expect(mockSimCol.findOne).toHaveBeenCalledWith({ sessionId: "sess-model-1" });
    });

    it("updates simulation status with timestamp", async () => {
      const updated = await updateSimulationStatus("sess-model-1", "completed", mockDb);
      expect(updated).toBe(true);
      expect(mockSimCol.updateOne).toHaveBeenCalledWith(
        { sessionId: "sess-model-1" },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: "completed",
            completedAt: expect.any(Date),
          }),
        })
      );
    });
  });

  describe("50-Quarter Query Benchmark (< 15ms)", () => {
    it("retrieves 50 quarter step documents in under 15ms", async () => {
      // Generate 50 mock quarter steps
      const mock50Steps: TimelineStepDocument[] = Array.from({ length: 50 }, (_, i) => ({
        sessionId: "sess-bench-50",
        timelineId: `tl-${(i % 12) + 1}`,
        branchOption: i % 2 === 0 ? "A" : "B",
        branchName: "Branch Benchmark",
        branchLocation: "London / Delhi",
        personaSeed: "bold",
        quarter: (i % 20) + 1,
        month: ((i % 20) + 1) * 3,
        startingSavings: 20000 + i * 500,
        endingSavings: 21000 + i * 500,
        netWorthDelta: 1000,
        monthlyIncome: 5000,
        monthlyBurn: 2500,
        stats: { happiness: 70, health: 70, relationships: 70, career: 70 },
        statDeltas: { deltaHappiness: 0, deltaHealth: 0, deltaRelationships: 0, deltaCareer: 0 },
        rolledEvent: {
          type: "steady",
          title: "Steady Progress",
          description: "Quarter benchmark",
          severity: "neutral",
          statDeltas: { deltaHappiness: 0, deltaHealth: 0, deltaRelationships: 0, deltaCareer: 0 },
          financialImpact: { incomeMultiplier: 1.0, lumpSumExpense: 0, lumpSumWindfall: 0 },
        },
        diaryEntry: `Quarter step ${i + 1} benchmark journal entry.`,
        reflection: "Reflecting on progression.",
        isBurnedOut: false,
        status: "active",
        recordedAt: new Date(),
      }));

      const benchStepCol = {
        find: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnThis(),
          toArray: vi.fn().mockResolvedValue(mock50Steps),
        }),
      } as unknown as Collection;

      const benchDb = {
        collection: vi.fn(() => benchStepCol),
      } as unknown as Db;

      const result = await benchmarkStepRetrieval("sess-bench-50", benchDb);

      expect(result.count).toBe(50);
      expect(result.durationMs).toBeLessThan(15);
    });
  });
});
