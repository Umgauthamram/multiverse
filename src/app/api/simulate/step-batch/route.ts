import { NextRequest, NextResponse } from "next/server";
import {
  verifyQStashSignature,
  dispatchBatchJob,
  BatchJobPayload,
} from "@/lib/queue/qstash";
import { applyAndClampStats } from "@/lib/simulation/statClamper";
import { calculateQuarterFinance } from "@/lib/simulation/financeEngine";
import { rollQuarterEvent } from "@/lib/simulation/eventRoller";
import { env } from "@/lib/env";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature =
      req.headers.get("upstash-signature") ||
      req.headers.get("Upstash-Signature");

    // Cryptographic webhook signature verification
    const isValid = await verifyQStashSignature(signature, rawBody, req.url);
    if (!isValid) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid QStash signature" },
        { status: 401 }
      );
    }

    const payload: BatchJobPayload = JSON.parse(rawBody);

    let runningSavings = payload.currentLiquidSavings;
    let runningMonthlyBurn = payload.currentMonthlyBurn;
    let runningStats = { ...payload.currentStats };
    const processedEvents = [];

    // Process chunk (e.g. Quarters 1–5 or 6–10)
    for (let q = payload.startQuarter; q <= payload.endQuarter; q++) {
      // 1. Roll quarterly life event with deterministic seed
      const event = rollQuarterEvent({
        seed: `${payload.sessionId}_${payload.timelineId}`,
        quarterIndex: q,
      });
      processedEvents.push(event);

      // 2. Deterministic zero-token financial compounding
      const monthlyIncome = 2800 * (event.financialImpact.incomeMultiplier || 1.0);
      const financeStep = calculateQuarterFinance({
        quarter: q,
        startingSavings: runningSavings,
        monthlyIncome,
        monthlyBaseExpenses: runningMonthlyBurn,
        eventCashImpact:
          (event.financialImpact.lumpSumWindfall || 0) -
          (event.financialImpact.lumpSumExpense || 0),
      });

      runningSavings = financeStep.endingSavings;
      runningMonthlyBurn = financeStep.effectiveMonthlyBurn;

      // 3. Stat clamping & burnout check
      const clamped = applyAndClampStats(runningStats, event.statDeltas);
      runningStats = clamped.stats;
    }

    const isComplete = payload.endQuarter >= 20;
    let nextScheduledMessageId: string | null = null;

    // If further quarters remain, dispatch the next 5-quarter chunk
    if (!isComplete) {
      const nextStart = payload.endQuarter + 1;
      const nextEnd = Math.min(20, nextStart + 4);

      const appUrl =
        env.NEXT_PUBLIC_APP_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "http://localhost:3000";
      const destinationUrl = `${appUrl}/api/simulate/step-batch`;

      const nextPayload: BatchJobPayload = {
        sessionId: payload.sessionId,
        timelineId: payload.timelineId,
        branchOption: payload.branchOption,
        personaSeed: payload.personaSeed,
        startQuarter: nextStart,
        endQuarter: nextEnd,
        currentLiquidSavings: runningSavings,
        currentMonthlyBurn: runningMonthlyBurn,
        currentStats: runningStats,
      };

      const dispatchResult = await dispatchBatchJob({
        destinationUrl,
        payload: nextPayload,
      });

      nextScheduledMessageId = dispatchResult.messageId;
    }

    return NextResponse.json({
      success: true,
      sessionId: payload.sessionId,
      timelineId: payload.timelineId,
      processedChunk: {
        startQuarter: payload.startQuarter,
        endQuarter: payload.endQuarter,
      },
      finalSavings: runningSavings,
      finalStats: runningStats,
      isComplete,
      nextScheduledMessageId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Batch worker failure";
    return NextResponse.json(
      { error: "Batch processing error", message },
      { status: 500 }
    );
  }
}
