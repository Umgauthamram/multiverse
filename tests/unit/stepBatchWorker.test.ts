import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/simulate/step-batch/route";
import * as qstash from "@/lib/queue/qstash";
import * as simModel from "@/lib/db/models/Simulation";
import * as sceneStore from "@/lib/scene/sceneStore";
import * as timelineRunner from "@/lib/simulation/timelineRunner";
import { getPersonaSeedProfile } from "@/lib/simulation/personaSeeder";
import { Collection } from "mongodb";
import { TimelineStepDocument } from "@/lib/db/models/Simulation";

describe("Phase 2: Step-Batch Worker Pipeline", () => {
  const sessionId = "sess_worker_test_1";
  const timelineId = "S1";

  beforeEach(() => {
    vi.restoreAllMocks();

    // Mock QStash signature verification to succeed
    vi.spyOn(qstash, "verifyQStashSignature").mockResolvedValue(true);

    // Mock Simulation doc loading
    vi.spyOn(simModel, "getSimulationBySessionId").mockResolvedValue({
      sessionId,
      userId: "user-1",
      decisionPrompt: "Should I join the seed AI startup in London?",
      age: 27,
      currentLocation: "Bengaluru, India",
      optionA: { name: "London AI Startup", location: "London, UK" },
      optionB: { name: "Delhi Corporate Lead", location: "Delhi, India" },
      corePriorities: ["career", "wealth"],
      status: "running",
      totalTimelines: 4,
      completedTimelines: 0,
      branches: [
        {
          timelineId: "S1",
          branchOption: "A",
          branchName: "London AI Startup",
          branchLocation: "London, UK",
          branchDescription: "High-upside AI role",
          personaSeed: "bold",
          personaProfile: getPersonaSeedProfile("bold"),
          initialStats: { happiness: 65, health: 70, relationships: 65, career: 60 },
          initialLiquidSavings: 25000,
          initialMonthlyBurn: 2500,
          seedRandom: "rnd",
          status: "active",
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Mock Steps collection count
    vi.spyOn(simModel, "getTimelineStepsCol").mockResolvedValue({
      countDocuments: vi.fn().mockResolvedValue(5),
    } as unknown as Collection<TimelineStepDocument>);
  });

  it("calls runQuarterStep per quarter, writes Scene lines, and chains next batch chunk", async () => {
    const appendedOps: sceneStore.AppendSceneLineInput[] = [];
    vi.spyOn(sceneStore, "appendLines").mockImplementation(async (_sess, ops) => {
      appendedOps.push(...ops);
    });

    const dispatchedJobs: qstash.BatchJobPayload[] = [];
    vi.spyOn(qstash, "dispatchBatchJob").mockImplementation(async (params) => {
      dispatchedJobs.push(params.payload);
      return { messageId: "msg_next_chunk", mode: "direct" };
    });

    let quarterCounter = 0;
    vi.spyOn(timelineRunner, "runQuarterStep").mockImplementation(async (config) => {
      quarterCounter++;
      // Call stage callbacks to verify scene line generation
      await config.onStage?.({
        stage: "roll",
        event: {
          type: "promotion",
          title: "Promotion to Tech Lead",
          description: "Stepped up into leadership",
          severity: "positive",
          statDeltas: { deltaHappiness: 4, deltaHealth: -1, deltaRelationships: 0, deltaCareer: 8 },
          financialImpact: { incomeMultiplier: 1.2, lumpSumExpense: 0, lumpSumWindfall: 2000 },
        },
      });
      await config.onStage?.({
        stage: "calc",
        cash0: config.currentSavings,
        inc: 5000,
        exp: 2500,
        evc: 2000,
        cash1: config.currentSavings + 9500,
      });
      await config.onStage?.({ stage: "think", provider: "groq" });
      await config.onStage?.({
        stage: "delta",
        rawDelta: { deltaHappiness: 3, deltaHealth: -1, deltaRelationships: -1, deltaCareer: 5 },
      });
      await config.onStage?.({
        stage: "clamp",
        stats: { happiness: 72, health: 68, relationships: 64, career: 73 },
        hit: "none",
      });
      await config.onStage?.({
        stage: "say",
        text: `Quarter ${config.quarter} completed with steady traction.`,
      });
      await config.onStage?.({ stage: "done" });

      return {
        sessionId: config.sessionId,
        timelineId: config.timelineId,
        branchOption: config.branchOption,
        branchName: config.branchName,
        branchLocation: config.branchLocation,
        personaSeed: config.personaSeed,
        quarter: config.quarter,
        month: config.quarter * 3,
        startingSavings: config.currentSavings,
        endingSavings: config.currentSavings + 7500,
        netWorthDelta: 7500,
        monthlyIncome: 6000,
        monthlyBurn: 2500,
        stats: { happiness: 72, health: 68, relationships: 64, career: 73 },
        statDeltas: { deltaHappiness: 3, deltaHealth: -1, deltaRelationships: -1, deltaCareer: 5 },
        rolledEvent: {
          type: "promotion",
          title: "Promotion",
          description: "Earned promotion",
          severity: "positive",
          statDeltas: { deltaHappiness: 4, deltaHealth: -1, deltaRelationships: 0, deltaCareer: 8 },
          financialImpact: { incomeMultiplier: 1.2, lumpSumExpense: 0, lumpSumWindfall: 2000 },
        },
        diaryEntry: `Diary for quarter ${config.quarter}`,
        reflection: "Momentum holds",
        isBurnedOut: false,
        status: "active",
        recordedAt: new Date(),
      };
    });

    const payload: qstash.BatchJobPayload = {
      sessionId,
      timelineId,
      branchOption: "A",
      personaSeed: "bold",
      startQuarter: 1,
      endQuarter: 5,
      currentLiquidSavings: 25000,
      currentMonthlyBurn: 2500,
      currentStats: { happiness: 65, health: 70, relationships: 65, career: 60 },
    };

    const req = new NextRequest("http://localhost:3000/api/simulate/step-batch", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "upstash-signature": "valid-test-sig",
      },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.isComplete).toBe(false);
    expect(data.nextScheduledMessageId).toBe("msg_next_chunk");

    // Proves runQuarterStep was called 5 times (quarters 1 to 5)
    expect(quarterCounter).toBe(5);

    // Proves Scene lines were written
    expect(appendedOps.length).toBeGreaterThan(0);
    expect(appendedOps.some((op) => op.line.includes("ROLL"))).toBe(true);
    expect(appendedOps.some((op) => op.line.includes("CALC"))).toBe(true);

    // Proves QStash chained next chunk (Quarters 6–10)
    expect(dispatchedJobs).toHaveLength(1);
    expect(dispatchedJobs[0].startQuarter).toBe(6);
    expect(dispatchedJobs[0].endQuarter).toBe(10);
    expect(dispatchedJobs[0].currentLiquidSavings).toBeGreaterThan(25000);
  });
});
