import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/simulate/stream/[id]/route";
import {
  formatSSE,
  streamManager,
} from "@/lib/simulation/streamManager";
import { TimelineQuarterRecord } from "@/lib/simulation/timelineRunner";

describe("Phase 19: Server-Sent Events (SSE) Progress Streaming", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("formatSSE wire protocol helper", () => {
    it("formats event and JSON data correctly according to SSE specification", () => {
      const formatted = formatSSE("quarter_step", { quarter: 1, happiness: 75 });
      expect(formatted).toBe('event: quarter_step\ndata: {"quarter":1,"happiness":75}\n\n');
    });

    it("formats string data properly without double serialization", () => {
      const formatted = formatSSE("heartbeat", "ping");
      expect(formatted).toBe("event: heartbeat\ndata: ping\n\n");
    });
  });

  describe("streamManager pub/sub engine", () => {
    it("coordinates publish and subscribe across sessions with proper cleanup", () => {
      const sessionId = "sess-stream-test";
      const receivedSteps: TimelineQuarterRecord[] = [];
      let isCompleted = false;

      const unsubscribe = streamManager.subscribe(sessionId, {
        onStep: (step) => {
          receivedSteps.push(step);
        },
        onComplete: () => {
          isCompleted = true;
        },
      });

      const mockRecord: TimelineQuarterRecord = {
        sessionId,
        timelineId: "tl-1",
        branchOption: "A",
        branchName: "London AI Startup",
        branchLocation: "London, UK",
        personaSeed: "bold",
        quarter: 1,
        month: 3,
        startingSavings: 25000,
        endingSavings: 28000,
        netWorthDelta: 3000,
        monthlyIncome: 6000,
        monthlyBurn: 3000,
        stats: { happiness: 70, health: 65, relationships: 60, career: 80 },
        statDeltas: { deltaHappiness: 5, deltaHealth: -5, deltaRelationships: 0, deltaCareer: 10 },
        rolledEvent: {
          type: "promotion",
          title: "Promoted to Senior",
          description: "Earned promotion",
          severity: "positive",
          statDeltas: { deltaHappiness: 5, deltaHealth: 0, deltaRelationships: 0, deltaCareer: 10 },
          financialImpact: { incomeMultiplier: 1.15, lumpSumExpense: 0, lumpSumWindfall: 2000 },
        },
        diaryEntry: "Quarter 1 shipped early.",
        reflection: "Career velocity high.",
        isBurnedOut: false,
        status: "active",
        recordedAt: new Date(),
      };

      // Emit step
      streamManager.emitStep(mockRecord);
      expect(receivedSteps).toHaveLength(1);
      expect(receivedSteps[0].quarter).toBe(1);

      // Emit complete
      streamManager.emitComplete(sessionId);
      expect(isCompleted).toBe(true);

      // Unsubscribe and verify no more events received
      unsubscribe();
      streamManager.emitStep({ ...mockRecord, quarter: 2 });
      expect(receivedSteps).toHaveLength(1);
    });
  });

  describe("GET /api/simulate/stream/[id] Route Handler", () => {
    it("returns 200 with text/event-stream headers and streams connected greeting", async () => {
      const sessionId = "sess-http-test-1";
      const req = new NextRequest(`http://localhost:3000/api/simulate/stream/${sessionId}`);
      const params = Promise.resolve({ id: sessionId });

      const response = await GET(req, { params });

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("text/event-stream; charset=utf-8");
      expect(response.headers.get("Cache-Control")).toBe("no-cache, no-transform");
      expect(response.headers.get("Connection")).toBe("keep-alive");
      expect(response.headers.get("X-Accel-Buffering")).toBe("no");

      expect(response.body).not.toBeNull();
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      // Read initial connection event
      const firstChunk = await reader.read();
      expect(firstChunk.done).toBe(false);
      const text = decoder.decode(firstChunk.value);
      expect(text).toContain("event: connected");
      expect(text).toContain(sessionId);

      // Clean up stream
      reader.cancel();
    });

    it("streams live quarter step events and completes stream on simulation_complete", async () => {
      const sessionId = "sess-http-test-2";
      const req = new NextRequest(`http://localhost:3000/api/simulate/stream/${sessionId}`);
      const params = Promise.resolve({ id: sessionId });

      const response = await GET(req, { params });
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      // 1. Read greeting
      await reader.read();

      // 2. Emit a live step
      const mockRecord: TimelineQuarterRecord = {
        sessionId,
        timelineId: "tl-2",
        branchOption: "B",
        branchName: "Delhi Corporate Lead",
        branchLocation: "Delhi, India",
        personaSeed: "balanced",
        quarter: 1,
        month: 3,
        startingSavings: 20000,
        endingSavings: 24000,
        netWorthDelta: 4000,
        monthlyIncome: 4500,
        monthlyBurn: 2000,
        stats: { happiness: 75, health: 80, relationships: 75, career: 65 },
        statDeltas: { deltaHappiness: 0, deltaHealth: 0, deltaRelationships: 0, deltaCareer: 5 },
        rolledEvent: {
          type: "steady",
          title: "Quarterly Steady State",
          description: "Routine progress",
          severity: "neutral",
          statDeltas: { deltaHappiness: 0, deltaHealth: 0, deltaRelationships: 0, deltaCareer: 0 },
          financialImpact: { incomeMultiplier: 1.0, lumpSumExpense: 0, lumpSumWindfall: 0 },
        },
        diaryEntry: "Balanced rhythm maintained.",
        reflection: "Predictable stability.",
        isBurnedOut: false,
        status: "active",
        recordedAt: new Date(),
      };

      streamManager.emitStep(mockRecord);

      const stepChunk = await reader.read();
      expect(stepChunk.done).toBe(false);
      const stepText = decoder.decode(stepChunk.value);
      expect(stepText).toContain("event: quarter_step");
      expect(stepText).toContain("Delhi Corporate Lead");

      // 3. Emit complete
      streamManager.emitComplete(sessionId, { status: "completed", finalScore: 88 });

      const completeChunk = await reader.read();
      expect(completeChunk.done).toBe(false);
      const completeText = decoder.decode(completeChunk.value);
      expect(completeText).toContain("event: simulation_complete");
      expect(completeText).toContain("finalScore");

      // 4. Verify stream termination
      const endChunk = await reader.read();
      expect(endChunk.done).toBe(true);
    });
  });
});
