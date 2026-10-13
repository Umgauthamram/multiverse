import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dispatchBatchJob, BatchJobPayload } from "@/lib/queue/qstash";
import { env } from "@/lib/env";

const DispatchRequestSchema = z.object({
  sessionId: z.string().min(1),
  timelines: z
    .array(
      z.object({
        timelineId: z.string().min(1),
        branchOption: z.enum(["A", "B"]),
        personaSeed: z.string().min(1),
        initialLiquidSavings: z.number(),
        initialMonthlyBurn: z.number(),
        initialStats: z.object({
          happiness: z.number(),
          health: z.number(),
          relationships: z.number(),
          career: z.number(),
        }),
      })
    )
    .min(1)
    .max(12),
});

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const parsed = DispatchRequestSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid dispatch payload",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { sessionId, timelines } = parsed.data;
    const appUrl =
      env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";
    const destinationUrl = `${appUrl}/api/simulate/step-batch`;

    const dispatched: Array<{ timelineId: string; messageId: string }> = [];

    // Dispatch initial 5-quarter batch (Quarters 1–5) for all timelines
    for (const timeline of timelines) {
      const payload: BatchJobPayload = {
        sessionId,
        timelineId: timeline.timelineId,
        branchOption: timeline.branchOption,
        personaSeed: timeline.personaSeed,
        startQuarter: 1,
        endQuarter: 5,
        currentLiquidSavings: timeline.initialLiquidSavings,
        currentMonthlyBurn: timeline.initialMonthlyBurn,
        currentStats: timeline.initialStats,
      };

      const result = await dispatchBatchJob({
        destinationUrl,
        payload,
      });

      dispatched.push({
        timelineId: timeline.timelineId,
        messageId: result.messageId,
      });
    }

    return NextResponse.json({
      success: true,
      sessionId,
      totalTimelines: timelines.length,
      dispatchedCount: dispatched.length,
      dispatched,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Dispatch failure";
    return NextResponse.json(
      { error: "Internal dispatch error", message },
      { status: 500 }
    );
  }
}
