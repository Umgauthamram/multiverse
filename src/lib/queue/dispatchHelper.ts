/**
 * Shared Dispatch Helper
 * Dispatches initial 5-quarter batches for simulation timelines to QStash worker.
 */

import { dispatchBatchJob, BatchJobPayload } from "@/lib/queue/qstash";
import { env } from "@/lib/env";

export interface DispatchTimelineInput {
  timelineId: string;
  branchOption: "A" | "B";
  personaSeed: string;
  initialLiquidSavings: number;
  initialMonthlyBurn: number;
  initialStats: {
    happiness: number;
    health: number;
    relationships: number;
    career: number;
  };
}

export async function dispatchTimelines(
  sessionId: string,
  timelines: DispatchTimelineInput[],
  appUrl?: string
): Promise<Array<{ timelineId: string; messageId: string }>> {
  const base =
    appUrl ||
    env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  const destinationUrl = `${base}/api/simulate/step-batch`;

  const dispatched: Array<{ timelineId: string; messageId: string }> = [];

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

  return dispatched;
}
