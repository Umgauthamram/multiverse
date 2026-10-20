import { NextRequest, NextResponse } from "next/server";
import {
  verifyQStashSignature,
  dispatchBatchJob,
  BatchJobPayload,
} from "@/lib/queue/qstash";
import { runQuarterStep, QuarterStage } from "@/lib/simulation/timelineRunner";
import { getSimulationBySessionId, getTimelineStepsCol } from "@/lib/db/models/Simulation";
import {
  compileQuarterStageToLines,
  compileEnd,
  compileProgress,
  compileReroute,
} from "@/lib/scene/sceneCompiler";
import { formatLine } from "@/lib/scene/sceneLanguage";
import { appendLines, AppendSceneLineInput } from "@/lib/scene/sceneStore";
import { streamManager } from "@/lib/simulation/streamManager";
import { env } from "@/lib/env";
import { PersonaSeedType } from "@/lib/simulation/personaSeeder";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature =
      req.headers.get("upstash-signature") ||
      req.headers.get("Upstash-Signature");

    // Cryptographic webhook signature verification (bypassed in test/offline dev)
    const isValid = await verifyQStashSignature(signature, rawBody, req.url);
    if (!isValid) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid QStash signature" },
        { status: 401 }
      );
    }

    const payload: BatchJobPayload = JSON.parse(rawBody);

    // 1. Load context from MongoDB simulation doc
    let simDoc = null;
    try {
      if (process.env.MONGODB_URI) {
        simDoc = await getSimulationBySessionId(payload.sessionId);
      }
    } catch (e) {
      console.warn("[StepBatch] Failed to load simulation doc from DB, falling back to payload defaults:", e);
    }
    const decisionPrompt =
      simDoc?.decisionPrompt ||
      "Should I take the new opportunity or stay on the current path?";

    const branch = simDoc?.branches?.find(
      (b) => b.timelineId === payload.timelineId
    );
    const branchName =
      branch?.branchName ||
      (payload.branchOption === "A"
        ? simDoc?.optionA.name || "Option A"
        : simDoc?.optionB.name || "Option B");
    const branchLocation =
      branch?.branchLocation ||
      (payload.branchOption === "A"
        ? simDoc?.optionA.location || "Location A"
        : simDoc?.optionB.location || "Location B");

    const costOfLivingIndex = branchLocation.toLowerCase().includes("london")
      ? 1.35
      : 1.0;
    const monthlyIncome = payload.branchOption === "A" ? 5000 : 4000;

    let runningSavings = payload.currentLiquidSavings;
    const runningMonthlyBurn = payload.currentMonthlyBurn;
    let runningStats = { ...payload.currentStats };
    const processedSteps = [];

    // 2. Process chunk of quarters (e.g. 1-5, 6-10, etc.)
    for (let q = payload.startQuarter; q <= payload.endQuarter; q++) {
      const quarterSceneOps: AppendSceneLineInput[] = [];
      let stageIdx = 0;

      const onStage = async (stage: QuarterStage) => {
        let lines: string[] = [];
        if (stage.stage === "roll") {
          lines = compileQuarterStageToLines("roll", {
            storyId: payload.timelineId,
            quarter: q,
            rolledEvent: stage.event,
          });
        } else if (stage.stage === "calc") {
          lines = compileQuarterStageToLines("calc", {
            storyId: payload.timelineId,
            quarter: q,
            finance: {
              startingSavings: stage.cash0,
              effectiveMonthlyIncome: stage.inc,
              monthlyBaseExpenses: stage.exp,
              netEventCashImpact: stage.evc,
              endingSavings: stage.cash1,
            },
          });
        } else if (stage.stage === "think") {
          lines = compileQuarterStageToLines("think", {
            storyId: payload.timelineId,
            quarter: q,
            provider: stage.provider,
          });
        } else if (stage.stage === "delta") {
          lines = compileQuarterStageToLines("delta", {
            storyId: payload.timelineId,
            quarter: q,
            rawDelta: stage.rawDelta,
          });
        } else if (stage.stage === "clamp") {
          lines = compileQuarterStageToLines("clamp", {
            storyId: payload.timelineId,
            quarter: q,
            clampedStats: stage.stats,
          });
        } else if (stage.stage === "status") {
          lines = compileQuarterStageToLines("clamp", {
            storyId: payload.timelineId,
            quarter: q,
            clampedStats: runningStats,
            status: stage.status,
            isBurnout: stage.burn === 1,
          }).slice(1); // take the STATUS line
        } else if (stage.stage === "say") {
          lines = compileQuarterStageToLines("say", {
            storyId: payload.timelineId,
            quarter: q,
            diaryText: stage.text,
          });
        } else if (stage.stage === "done") {
          lines = compileQuarterStageToLines("done", {
            storyId: payload.timelineId,
            quarter: q,
          });
        }

        for (const line of lines) {
          quarterSceneOps.push({
            storyId: payload.timelineId,
            quarter: q,
            idx: stageIdx++,
            line,
          });
        }
      };

      const onFallback = async (from: string, to: string) => {
        const rerouteLine = compileReroute(from, to);
        quarterSceneOps.push({
          storyId: "*",
          quarter: 0,
          idx: Date.now() + stageIdx++,
          line: formatLine(rerouteLine),
        });
      };

      const step = await runQuarterStep({
        sessionId: payload.sessionId,
        timelineId: payload.timelineId,
        branchOption: payload.branchOption,
        branchName,
        branchLocation,
        personaSeed: payload.personaSeed as PersonaSeedType,
        decisionPrompt,
        quarter: q,
        currentStats: runningStats,
        currentSavings: runningSavings,
        monthlyIncome,
        monthlyExpenses: runningMonthlyBurn,
        costOfLivingIndex,
        persistToDb: !!process.env.MONGODB_URI,
        onStage,
        onFallback,
      });

      processedSteps.push(step);
      runningSavings = step.endingSavings;
      runningStats = { ...step.stats };

      // Append PROGRESS line
      try {
        let doneCount = payload.startQuarter * 4;
        if (process.env.MONGODB_URI) {
          const stepsCol = await getTimelineStepsCol();
          doneCount = await stepsCol.countDocuments({ sessionId: payload.sessionId });
        }
        const progressLine = compileProgress(doneCount, 80);
        quarterSceneOps.push({
          storyId: "*",
          quarter: 0,
          idx: Date.now() + stageIdx++,
          line: formatLine(progressLine),
        });
      } catch {
        // Fallback progress estimate
      }

      // Write compiled Scene lines to scene_ops in Mongo
      try {
        await appendLines(payload.sessionId, quarterSceneOps);
      } catch (sceneErr) {
        console.warn(`[StepBatch] sceneStore append error for Q${q}:`, sceneErr);
      }

      // Publish to same-instance SSE emitter
      streamManager.emitStep(step);
    }

    const isComplete = payload.endQuarter >= 20;
    let nextScheduledMessageId: string | null = null;

    if (isComplete) {
      // Story reached Month 60 (20 quarters)
      const lastStep = processedSteps[processedSteps.length - 1];
      const endLine = compileEnd(
        payload.timelineId,
        runningSavings,
        lastStep?.status || "thriving"
      );
      try {
        await appendLines(payload.sessionId, [
          {
            storyId: payload.timelineId,
            quarter: 20,
            idx: 99,
            line: formatLine(endLine),
          },
        ]);
      } catch (err) {
        console.warn("[StepBatch] Failed to append END line:", err);
      }

      // Check if all 4 stories are complete
      try {
        if (process.env.MONGODB_URI) {
          const stepsCol = await getTimelineStepsCol();
          const totalCompleted = await stepsCol.countDocuments({
            sessionId: payload.sessionId,
            quarter: 20,
          });

          if (totalCompleted >= 4) {
            // Trigger narrator route asynchronously
            const appUrl =
              env.NEXT_PUBLIC_APP_URL ||
              process.env.NEXT_PUBLIC_APP_URL ||
              "http://localhost:3000";
            fetch(`${appUrl}/api/simulate/narrator`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId: payload.sessionId }),
            }).catch((narratorErr) => {
              console.warn("[StepBatch] Failed to trigger narrator:", narratorErr);
            });
          }
        }
      } catch (checkErr) {
        console.warn("[StepBatch] Error checking simulation completion:", checkErr);
      }
    } else {
      // Schedule next 5-quarter chunk
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
    console.error("[StepBatch] Error:", err);
    return NextResponse.json(
      { error: "Batch processing error", message },
      { status: 500 }
    );
  }
}
