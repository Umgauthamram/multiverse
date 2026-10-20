import { NextRequest } from "next/server";
import { formatSSE, streamManager } from "@/lib/simulation/streamManager";
import { getDb } from "@/lib/db/mongodb";
import { readLinesAfter } from "@/lib/scene/sceneStore";

/**
 * Server-Sent Events (SSE) Route Handler
 * Streams real-time quarter updates for a simulation session to client HUDs.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id: sessionId } = await params;

  if (!sessionId) {
    return new Response(
      JSON.stringify({ error: "Missing required sessionId parameter" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;

      const safeEnqueue = (chunk: string) => {
        if (isClosed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          isClosed = true;
        }
      };

      const safeClose = () => {
        if (isClosed) return;
        isClosed = true;
        try {
          controller.close();
        } catch {
          // Controller might already be closed
        }
      };

      // 1. Initial connection greeting
      safeEnqueue(
        formatSSE("connected", {
          sessionId,
          connectedAt: new Date().toISOString(),
        })
      );

      let pollInterval: NodeJS.Timeout | null = null;
      let heartbeatInterval: NodeJS.Timeout | null = null;

      const cleanup = () => {
        if (pollInterval) clearInterval(pollInterval);
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        unsubscribe();
      };

      // 2. Subscribe to live simulation events immediately (fast path, avoids race conditions)
      const unsubscribe = streamManager.subscribe(sessionId, {
        onStep: (step) => {
          safeEnqueue(formatSSE("quarter_step", step));
        },
        onComplete: (summary) => {
          safeEnqueue(formatSSE("simulation_complete", summary));
          cleanup();
          safeClose();
        },
        onError: (err) => {
          safeEnqueue(
            formatSSE("error", {
              message: err instanceof Error ? err.message : String(err),
            })
          );
          cleanup();
          safeClose();
        },
      });

      // 3. Replay historical steps already persisted in MongoDB
      try {
        const db = await getDb();
        const stepsCol = db.collection("timeline_steps");
        const existingSteps = await stepsCol
          .find({ sessionId })
          .sort({ quarter: 1, month: 1 })
          .toArray();

        for (const step of existingSteps) {
          safeEnqueue(formatSSE("quarter_step", step));
        }
      } catch (dbErr) {
        console.warn(
          `[SSE Stream] Warning: Failed to query historical steps for session ${sessionId}:`,
          dbErr
        );
      }

      // 4. Scene Language replay and polling with ?after= support
      let currentCursor: string | null = null;
      try {
        const url = new URL(req.url);
        currentCursor = url.searchParams.get("after") || null;
      } catch {
        currentCursor = req.nextUrl?.searchParams?.get("after") || null;
      }

      const checkSceneOps = async () => {
        if (isClosed) return;
        try {
          const result = await readLinesAfter(sessionId, currentCursor, 100);

          if (result && result.lines && result.lines.length > 0) {
            safeEnqueue(
              formatSSE("scene", {
                cursor: result.nextCursor,
                lines: result.lines,
              })
            );
            currentCursor = result.nextCursor;

            // Check if FINISH line was emitted
            if (result.lines.some((l) => l.includes("FINISH"))) {
              cleanup();
              safeClose();
            }
          }
        } catch {
          // If Mongo is offline in unit tests, gracefully bypass polling
        }
      };

      // Initial scene replay
      await checkSceneOps();

      // Poll scene ops every 500ms to catch lines from different serverless worker instances
      pollInterval = setInterval(() => {
        checkSceneOps().catch(() => {});
      }, 500);

      // 5. Keep-alive heartbeat interval to prevent proxy disconnects
      heartbeatInterval = setInterval(() => {
        safeEnqueue(": keepalive\n\n");
      }, 15000);

      // Clean up when client disconnects
      req.signal.addEventListener("abort", () => {
        cleanup();
        safeClose();
      });
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
