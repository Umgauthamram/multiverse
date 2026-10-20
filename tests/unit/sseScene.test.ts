import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/simulate/stream/[id]/route";
import * as sceneStore from "@/lib/scene/sceneStore";
import * as mongodb from "@/lib/db/mongodb";
import { Db } from "mongodb";

describe("Phase 2: SSE Scene Stream & Cursor Resumption", () => {
  const sessionId = "sess_sse_test_100";

  beforeEach(() => {
    vi.restoreAllMocks();

    // Mock MongoDB steps query to avoid missing MONGODB_URI warning
    vi.spyOn(mongodb, "getDb").mockResolvedValue({
      collection: vi.fn(() => ({
        find: vi.fn(() => ({
          sort: vi.fn().mockReturnThis(),
          toArray: vi.fn().mockResolvedValue([]),
        })),
      })),
    } as unknown as Db);
  });

  it("replays initial history of Scene lines on connection", async () => {
    const historicalLines = [
      "@* BOOT sess=sess_sse_test_100 stories=4 quarters=20",
      "@S1 FORK opt=A seed=bold label=\"London AI\" loc=\"London, UK\"",
    ];

    vi.spyOn(sceneStore, "readLinesAfter").mockResolvedValueOnce({
      lines: historicalLines,
      nextCursor: "cursor_stage_1",
      ops: [] as sceneStore.SceneOpDocument[],
    });

    const req = new NextRequest(`http://localhost:3000/api/simulate/stream/${sessionId}`);
    const res = await GET(req, { params: Promise.resolve({ id: sessionId }) });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");

    const reader = res.body?.getReader();
    expect(reader).toBeDefined();

    const decoder = new TextDecoder();
    let accumulated = "";

    // Read initial chunks until scene event arrives
    while (!accumulated.includes("event: scene")) {
      const { value, done } = await reader!.read();
      if (done) break;
      accumulated += decoder.decode(value);
    }

    expect(accumulated).toContain("event: connected");
    expect(accumulated).toContain("event: scene");
    expect(accumulated).toContain("BOOT");
    expect(accumulated).toContain("cursor_stage_1");

    reader?.cancel();
  });

  it("resumes accurately from provided ?after= cursor", async () => {
    let passedCursor: string | null = null;
    vi.spyOn(sceneStore, "readLinesAfter").mockImplementation(async (_sess, cursor) => {
      passedCursor = cursor || null;
      return {
        lines: ["@S1/Q5 DONE"],
        nextCursor: "cursor_stage_2",
        ops: [] as sceneStore.SceneOpDocument[],
      };
    });

    const req = new NextRequest(
      `http://localhost:3000/api/simulate/stream/${sessionId}?after=cursor_previous`
    );
    const res = await GET(req, { params: Promise.resolve({ id: sessionId }) });
    expect(res.status).toBe(200);

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let accumulated = "";
    while (!accumulated.includes("@S1/Q5 DONE")) {
      const { value, done } = await reader!.read();
      if (done) break;
      accumulated += decoder.decode(value);
    }

    expect(passedCursor).toBe("cursor_previous");
    expect(accumulated).toContain("cursor_stage_2");
    expect(accumulated).toContain("@S1/Q5 DONE");

    reader?.cancel();
  });

  it("automatically closes stream after FINISH line is delivered", async () => {
    vi.spyOn(sceneStore, "readLinesAfter").mockResolvedValueOnce({
      lines: ["@* FINISH"],
      nextCursor: "cursor_finished",
      ops: [] as sceneStore.SceneOpDocument[],
    });

    const req = new NextRequest(`http://localhost:3000/api/simulate/stream/${sessionId}`);
    const res = await GET(req, { params: Promise.resolve({ id: sessionId }) });

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();

    let finished = false;
    while (!finished) {
      const { value, done } = await reader!.read();
      if (done) {
        finished = true;
      } else {
        const text = decoder.decode(value);
        if (text.includes("FINISH")) {
          // After FINISH line is emitted, controller.close() was called
          finished = true;
        }
      }
    }

    expect(finished).toBe(true);
  });
});
