import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dispatchTimelines } from "@/lib/queue/dispatchHelper";

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
    const dispatched = await dispatchTimelines(sessionId, timelines);

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
