import { NextRequest } from "next/server";
import { formatSSE, streamManager } from "@/lib/simulation/streamManager";
import { getDb } from "@/lib/db/mongodb";


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

      // 2. Replay any historical steps already persisted in MongoDB for this session
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
        // If DB is unavailable in local testing, continue with live events
        console.warn(
          `[SSE Stream] Warning: Failed to query historical steps for session ${sessionId}:`,
          dbErr
        );
      }

      // 3. Keep-alive heartbeat interval to prevent proxy disconnects
      const heartbeatInterval = setInterval(() => {
        safeEnqueue(": keepalive\n\n");
      }, 15000);

      // 4. Subscribe to live simulation events
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

      const cleanup = () => {
        clearInterval(heartbeatInterval);
        unsubscribe();
      };

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
