import { NextRequest, NextResponse } from "next/server";
import { validateIntakeInput } from "@/lib/schemas/intake";
import { evaluateIntakeSafety } from "@/lib/safety/crisisInterceptor";
import { generateWorldCast } from "@/lib/ai/agents/worldBuilder";
import { generateStorySeeds } from "@/lib/scene/storySeeds";
import { createSimulation } from "@/lib/db/models/Simulation";
import {
  compileBoot,
  compileFork,
  compileCast,
} from "@/lib/scene/sceneCompiler";
import { formatLine } from "@/lib/scene/sceneLanguage";
import { appendLines, AppendSceneLineInput } from "@/lib/scene/sceneStore";
import { dispatchTimelines } from "@/lib/queue/dispatchHelper";

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const validation = validateIntakeInput(raw);

    if (!validation.success || !validation.data) {
      return NextResponse.json(
        {
          error: "Invalid intake form payload",
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    const intake = validation.data;

    // 1. Run Crisis Interceptor Guardrail before any simulation work
    const safetyCheck = evaluateIntakeSafety(intake);
    if (safetyCheck.isCrisis) {
      return NextResponse.json(
        {
          success: false,
          isCrisis: true,
          crisis: safetyCheck,
        },
        { status: 200 }
      );
    }

    const sessionId = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 2. World-Builder Agent: generate supporting cast NPCs
    let castMembers = [];
    try {
      const worldOutput = await generateWorldCast({
        age: intake.age,
        currentLocation: intake.currentLocation,
        decisionPrompt: intake.decisionPrompt,
        optionA: intake.optionA,
        optionB: intake.optionB,
        corePriorities: intake.corePriorities,
      });
      castMembers = worldOutput.cast;
    } catch (wbErr) {
      console.warn("[StartRoute] WorldBuilder failed, using default cast:", wbErr);
      castMembers = [
        {
          id: "c1",
          name: "Priya",
          role: "partner" as const,
          archetype: "The Anchor",
          personality: "Supportive yet pragmatic about long-term stability",
          relationshipContext: "Long-term partner evaluating shared relocation",
          stakeInDilemma: "Directly affected by location and financial runway",
        },
        {
          id: "c2",
          name: "Marcus",
          role: "manager" as const,
          archetype: "The Demanding Mentor",
          personality: "High expectations with fast-track career upside",
          relationshipContext: "Direct reporting line in prospective team",
          stakeInDilemma: "Relies on high engineering output",
        },
        {
          id: "c3",
          name: "Elena",
          role: "friend" as const,
          archetype: "The Candid Confidante",
          personality: "Balances ambition with work-life reality checks",
          relationshipContext: "Former college classmate in tech",
          stakeInDilemma: "Values personal happiness over title prestige",
        },
      ];
    }

    // 3. Generate 4 canonical story seeds (S1-S4)
    const storySeeds = generateStorySeeds(intake, 4);

    // 4. Persist root simulation document
    try {
      await createSimulation({
        sessionId,
        userId: "anonymous",
        decisionPrompt: intake.decisionPrompt,
        age: intake.age,
        currentLocation: intake.currentLocation,
        optionA: intake.optionA,
        optionB: intake.optionB,
        corePriorities: intake.corePriorities,
        cast: castMembers,
        branches: storySeeds,
        totalTimelines: 4,
        completedTimelines: 0,
        status: "running",
      });
    } catch (dbErr) {
      console.warn("[StartRoute] MongoDB persist warning:", dbErr);
    }

    // 5. Append initial Scene Language lines: BOOT, FORK, CAST
    const initialLines: AppendSceneLineInput[] = [];
    let opIndex = 0;

    // BOOT line
    const bootLine = compileBoot(sessionId, storySeeds.length, 20);
    initialLines.push({
      storyId: "*",
      quarter: 0,
      idx: opIndex++,
      line: formatLine(bootLine),
    });

    // FORK lines for S1..S4
    for (const story of storySeeds) {
      const forkLine = compileFork(
        story.timelineId,
        story.branchOption,
        story.personaSeed,
        story.branchName,
        story.branchLocation
      );
      initialLines.push({
        storyId: story.timelineId,
        quarter: 0,
        idx: opIndex++,
        line: formatLine(forkLine),
      });
    }

    // CAST lines
    for (const member of castMembers) {
      const castLine = compileCast(
        member.role,
        member.name,
        member.personality?.slice(0, 32) || member.archetype
      );
      initialLines.push({
        storyId: "*",
        quarter: 0,
        idx: opIndex++,
        line: formatLine(castLine),
      });
    }

    try {
      await appendLines(sessionId, initialLines);
    } catch (sceneErr) {
      console.warn("[StartRoute] SceneStore append error:", sceneErr);
    }

    // 6. Dispatch the 4 story seeds to QStash batch worker
    let dispatched: Array<{ timelineId: string; messageId: string }> = [];
    try {
      dispatched = await dispatchTimelines(sessionId, storySeeds);
    } catch (dispatchErr) {
      console.warn("[StartRoute] Dispatch warning:", dispatchErr);
    }

    return NextResponse.json({
      success: true,
      sessionId,
      cast: castMembers,
      timelines: storySeeds,
      dispatched,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Start simulation failure";
    console.error("[StartRoute] Internal error:", err);
    return NextResponse.json(
      { error: "Failed to start simulation", message },
      { status: 500 }
    );
  }
}
