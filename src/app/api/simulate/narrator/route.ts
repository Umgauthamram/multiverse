import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getSimulationBySessionId,
  getTimelineStepsBySession,
  getSimulationsCol,
} from "@/lib/db/models/Simulation";
import { serializeSimulationDigest, TimelineSummaryInput } from "@/lib/simulation/digestSerializer";
import { generateNarratorReport } from "@/lib/ai/agents/narratorAgent";
import { compileNarrate, compileFinish } from "@/lib/scene/sceneCompiler";
import { formatLine } from "@/lib/scene/sceneLanguage";
import { appendLines } from "@/lib/scene/sceneStore";
import { streamManager } from "@/lib/simulation/streamManager";

const NarratorRequestSchema = z.object({
  sessionId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const parsed = NarratorRequestSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid narrator request", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { sessionId } = parsed.data;

    // 1. Scene Stage: Digest Preparation
    const digestLine = compileNarrate("digest");
    await appendLines(sessionId, [
      {
        storyId: "*",
        quarter: 0,
        idx: Date.now(),
        line: formatLine(digestLine),
      },
    ]);

    // 2. Load simulation context and step history
    const simDoc = await getSimulationBySessionId(sessionId);
    if (!simDoc) {
      return NextResponse.json(
        { error: `Simulation session "${sessionId}" not found` },
        { status: 404 }
      );
    }

    const steps = await getTimelineStepsBySession(sessionId);

    // Group steps by timelineId
    const stepsByTimeline = new Map<string, typeof steps>();
    for (const step of steps) {
      if (!stepsByTimeline.has(step.timelineId)) {
        stepsByTimeline.set(step.timelineId, []);
      }
      stepsByTimeline.get(step.timelineId)!.push(step);
    }

    // Build timeline summaries for digest
    const timelines: TimelineSummaryInput[] = [];
    const branches = simDoc.branches || [];

    for (let i = 0; i < branches.length; i++) {
      const branch = branches[i];
      const branchSteps = stepsByTimeline.get(branch.timelineId) || [];
      const lastStep = branchSteps[branchSteps.length - 1];

      timelines.push({
        timelineId: branch.timelineId,
        timelineIndex: i + 1,
        branchOption: branch.branchOption,
        branchName: branch.branchName,
        branchLocation: branch.branchLocation,
        personaSeed: branch.personaSeed,
        steps: branchSteps.map((s) => ({
          quarter: s.quarter,
          month: s.month,
          endingSavings: s.endingSavings,
          netWorthDelta: s.netWorthDelta,
          stats: s.stats,
          rolledEvent: s.rolledEvent,
          diaryEntry: s.diaryEntry,
          reflection: s.reflection,
          isBurnedOut: s.isBurnedOut,
        })),
        finalSavings: lastStep?.endingSavings ?? branch.initialLiquidSavings,
        finalStats: lastStep?.stats ?? branch.initialStats,
        isBurnedOut: lastStep?.isBurnedOut ?? false,
      });
    }

    const digestResult = serializeSimulationDigest({
      sessionId,
      decisionPrompt: simDoc.decisionPrompt,
      age: simDoc.age,
      currentLocation: simDoc.currentLocation,
      optionA: simDoc.optionA,
      optionB: simDoc.optionB,
      corePriorities: simDoc.corePriorities,
      timelines,
    });

    // 3. Scene Stage: Gemini Synthesis
    const geminiLine = compileNarrate("gemini");
    await appendLines(sessionId, [
      {
        storyId: "*",
        quarter: 0,
        idx: Date.now(),
        line: formatLine(geminiLine),
      },
    ]);

    // 4. Generate Narrator Report
    const narratorOutput = await generateNarratorReport({
      digestMarkdown: digestResult.markdown,
      decisionPrompt: simDoc.decisionPrompt,
      optionA: simDoc.optionA,
      optionB: simDoc.optionB,
      corePriorities: simDoc.corePriorities,
    });

    const report = narratorOutput.report;

    // 5. Scene Stage: Report Finalized
    const reportLine = compileNarrate("report");
    const doneLine = compileNarrate("done");
    const finishLine = compileFinish();

    await appendLines(sessionId, [
      {
        storyId: "*",
        quarter: 0,
        idx: Date.now(),
        line: formatLine(reportLine),
      },
      {
        storyId: "*",
        quarter: 0,
        idx: Date.now() + 1,
        line: formatLine(doneLine),
      },
      {
        storyId: "*",
        quarter: 0,
        idx: Date.now() + 2,
        line: formatLine(finishLine),
      },
    ]);

    // 6. Update simulation document in MongoDB
    try {
      const col = await getSimulationsCol();
      await col.updateOne(
        { sessionId },
        {
          $set: {
            status: "completed",
            completedAt: new Date(),
            finaleReport: report,
            updatedAt: new Date(),
          },
        }
      );
    } catch (saveErr) {
      console.warn("[NarratorRoute] Failed to save finaleReport to MongoDB:", saveErr);
    }

    // 7. Publish completion to same-instance streamManager
    streamManager.emitComplete(sessionId, {
      sessionId,
      status: "completed",
      completedAt: new Date().toISOString(),
      report,
    });

    return NextResponse.json({
      success: true,
      sessionId,
      report,
      telemetry: narratorOutput.telemetry,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Narrator failure";
    console.error("[NarratorRoute] Error:", err);
    return NextResponse.json(
      { error: "Narrator generation error", message },
      { status: 500 }
    );
  }
}
