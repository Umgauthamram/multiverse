import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import {
  verifyQStashSignature,
  dispatchBatchJob,
  BatchJobPayload,
} from "@/lib/queue/qstash";
import { POST as dispatchPost } from "@/app/api/simulate/dispatch/route";
import { POST as stepBatchPost } from "@/app/api/simulate/step-batch/route";

describe("Phase 16: Upstash QStash Worker & Async Job Dispatcher", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("QStash Signature Verification Utility", () => {
    it("rejects verification when signature header is missing or empty", async () => {
      const isValidNull = await verifyQStashSignature(null, JSON.stringify({}));
      const isValidEmpty = await verifyQStashSignature("", JSON.stringify({}));

      expect(isValidNull).toBe(false);
      expect(isValidEmpty).toBe(false);
    });

    it("rejects verification when signing keys are absent in non-dev environment", async () => {
      delete process.env.QSTASH_CURRENT_SIGNING_KEY;
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";

      const isValid = await verifyQStashSignature(
        "invalid_mock_signature",
        JSON.stringify({ test: true })
      );
      expect(isValid).toBe(false);
    });

    it("permits explicit development bypass when ALLOW_DEV_QSTASH_BYPASS is true", async () => {
      delete process.env.QSTASH_CURRENT_SIGNING_KEY;
      (process.env as Record<string, string | undefined>).NODE_ENV = "development";
      process.env.ALLOW_DEV_QSTASH_BYPASS = "true";

      const isValid = await verifyQStashSignature(
        "mock_signature",
        JSON.stringify({ test: true })
      );
      expect(isValid).toBe(true);
    });
  });

  describe("dispatchBatchJob Utility", () => {
    it("gracefully returns direct mock messageId when QStash credentials are not present", async () => {
      delete process.env.QSTASH_TOKEN;

      const payload: BatchJobPayload = {
        sessionId: "sess_01",
        timelineId: "tl_01",
        branchOption: "A",
        personaSeed: "bold",
        startQuarter: 1,
        endQuarter: 5,
        currentLiquidSavings: 20000,
        currentMonthlyBurn: 1500,
        currentStats: {
          happiness: 70,
          health: 70,
          relationships: 60,
          career: 60,
        },
      };

      const result = await dispatchBatchJob({
        destinationUrl: "http://localhost:3000/api/simulate/step-batch",
        payload,
      });

      expect(result.mode).toBe("direct");
      expect(result.messageId).toContain("tl_01");
    });
  });

  describe("API: /api/simulate/dispatch", () => {
    it("rejects invalid request payload with HTTP 400", async () => {
      const invalidReq = new NextRequest(
        "http://localhost:3000/api/simulate/dispatch",
        {
          method: "POST",
          body: JSON.stringify({
            sessionId: "", // invalid empty string
            timelines: [], // invalid empty array
          }),
        }
      );

      const res = await dispatchPost(invalidReq);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error).toBe("Invalid dispatch payload");
    });

    it("successfully dispatches initial batch jobs with HTTP 200", async () => {
      const validReq = new NextRequest(
        "http://localhost:3000/api/simulate/dispatch",
        {
          method: "POST",
          body: JSON.stringify({
            sessionId: "session_abc",
            timelines: [
              {
                timelineId: "session_abc_A_bold",
                branchOption: "A",
                personaSeed: "bold",
                initialLiquidSavings: 25000,
                initialMonthlyBurn: 1800,
                initialStats: {
                  happiness: 65,
                  health: 70,
                  relationships: 65,
                  career: 60,
                },
              },
            ],
          }),
        }
      );

      const res = await dispatchPost(validReq);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.sessionId).toBe("session_abc");
      expect(body.totalTimelines).toBe(1);
      expect(body.dispatchedCount).toBe(1);
      expect(body.dispatched[0].timelineId).toBe("session_abc_A_bold");
    });
  });

  describe("API: /api/simulate/step-batch", () => {
    it("rejects unauthorized webhook requests missing QStash signature with HTTP 401", async () => {
      const unauthenticatedReq = new NextRequest(
        "http://localhost:3000/api/simulate/step-batch",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );

      const res = await stepBatchPost(unauthenticatedReq);
      expect(res.status).toBe(401);

      const body = await res.json();
      expect(body.error).toContain("Unauthorized");
    });

    it("processes batch chunk and schedules subsequent chunk when authenticated", async () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "development";
      process.env.ALLOW_DEV_QSTASH_BYPASS = "true";

      const payload: BatchJobPayload = {
        sessionId: "sess_xyz",
        timelineId: "tl_bold",
        branchOption: "A",
        personaSeed: "bold",
        startQuarter: 1,
        endQuarter: 5,
        currentLiquidSavings: 30000,
        currentMonthlyBurn: 2000,
        currentStats: {
          happiness: 70,
          health: 70,
          relationships: 65,
          career: 60,
        },
      };

      const authenticatedReq = new NextRequest(
        "http://localhost:3000/api/simulate/step-batch",
        {
          method: "POST",
          headers: {
            "upstash-signature": "valid_dev_mock_sig",
          },
          body: JSON.stringify(payload),
        }
      );

      const res = await stepBatchPost(authenticatedReq);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.sessionId).toBe("sess_xyz");
      expect(body.timelineId).toBe("tl_bold");
      expect(body.processedChunk.startQuarter).toBe(1);
      expect(body.processedChunk.endQuarter).toBe(5);
      expect(body.isComplete).toBe(false); // Quarters 1–5 is not complete yet
      expect(body.nextScheduledMessageId).toBeDefined();
    });

    it("marks simulation complete when reaching Quarter 20", async () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "development";
      process.env.ALLOW_DEV_QSTASH_BYPASS = "true";

      const finalChunkPayload: BatchJobPayload = {
        sessionId: "sess_final",
        timelineId: "tl_final",
        branchOption: "B",
        personaSeed: "pragmatist",
        startQuarter: 16,
        endQuarter: 20,
        currentLiquidSavings: 85000,
        currentMonthlyBurn: 2500,
        currentStats: {
          happiness: 75,
          health: 70,
          relationships: 80,
          career: 80,
        },
      };

      const finalReq = new NextRequest(
        "http://localhost:3000/api/simulate/step-batch",
        {
          method: "POST",
          headers: {
            "upstash-signature": "valid_dev_mock_sig",
          },
          body: JSON.stringify(finalChunkPayload),
        }
      );

      const res = await stepBatchPost(finalReq);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.isComplete).toBe(true);
      expect(body.nextScheduledMessageId).toBeNull();
    });
  });
});
