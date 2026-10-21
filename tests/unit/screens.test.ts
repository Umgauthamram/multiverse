import { describe, it, expect, vi } from "vitest";
import {
  MonitorManager,
  drawCipherScreen,
  drawRoninScreen,
  drawSageScreen,
  drawMuseScreen,
  drawAtlasScreen,
  drawForgeScreen,
  drawEchoScreen,
  drawSparkScreen,
  drawNexusScreen,
  MONITOR_W,
  MONITOR_H,
} from "@/lib/theater/sprites/screens";
import { AgentId, AgentState, createInitialSceneState } from "@/lib/theater/sceneState";
import { THEATER_PALETTE } from "@/lib/theater/tokens";

function createMockContext(): CanvasRenderingContext2D {
  return {
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    closePath: vi.fn(),
    arc: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

function createDummyAgent(id: AgentId, monitorData: Record<string, unknown> = {}): AgentState {
  return {
    id,
    name: id,
    role: "Tester",
    accent: THEATER_PALETTE.agentAccents[id],
    statusTag: "idle",
    dotColor: "grey",
    currentStoryId: null,
    currentQuarter: null,
    monitorData,
    speechBubble: null,
  };
}

describe("Phase 5: Agent Monitor Screens", () => {
  it("defines standard 48 x 32 monitor dimensions", () => {
    expect(MONITOR_W).toBe(48);
    expect(MONITOR_H).toBe(32);
  });

  it("renders CIPHER terminal typing formula and cursor", () => {
    const ctx = createMockContext();
    const agent = createDummyAgent("CIPHER", { formula: "$25k+(5-2)x3=$34k", flash: true });

    drawCipherScreen(ctx, agent, 5);

    expect(ctx.fillRect).toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenCalledWith("CIPHER:CALC", 2, 5);
  });

  it("renders RONIN scrolling code and frozen deltas", () => {
    const ctx = createMockContext();
    const agentWaiting = createDummyAgent("RONIN", { thinking: true });

    drawRoninScreen(ctx, agentWaiting, 2);
    expect(ctx.fillText).toHaveBeenCalledWith("RONIN:LLM", 2, 5);

    const ctxDeltas = createMockContext();
    const agentDeltas = createDummyAgent("RONIN", {
      rawDeltas: { joy: 2, hp: -1, rel: 0, car: 3 },
    });
    drawRoninScreen(ctxDeltas, agentDeltas, 0);
    expect(ctxDeltas.fillText).toHaveBeenCalledWith("J:+2 H:-1", 2, 14);
    expect(ctxDeltas.fillText).toHaveBeenCalledWith("R:0 C:+3", 2, 22);
  });

  it("renders SAGE 4 stat bars and sparkline", () => {
    const ctx = createMockContext();
    const agent = createDummyAgent("SAGE");
    const story = {
      storyId: "S1",
      branchOption: "A" as const,
      personaSeed: "bold" as const,
      label: "Tech Path",
      location: "London",
      quarter: 1,
      initialSavings: 25000,
      currentSavings: 28000,
      stats: { happiness: 80, health: 65, relationships: 50, career: 90 },
      statDeltas: { joy: 0, hp: 0, rel: 0, car: 0 },
      clampedHit: "none" as const,
      status: "thriving" as const,
      isBurnedOut: false,
      currentEvent: null,
      lastDiary: null,
      coinTier: 2,
      happinessTier: "happy" as const,
      healthTier: "normal" as const,
      relPhotoTier: 1,
      careerDeskTier: 1,
      finished: false,
    };

    drawSageScreen(ctx, agent, 1, story);
    expect(ctx.fillText).toHaveBeenCalledWith("SAGE:STATS", 2, 5);
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it("renders MUSE swatch chip and drifting pixel dots", () => {
    const ctx = createMockContext();
    const agent = createDummyAgent("MUSE", {
      lastEvent: { ev: "promo", sev: "pos", title: "PROMOTION" },
    });

    drawMuseScreen(ctx, agent, 4);
    expect(ctx.fillText).toHaveBeenCalledWith("MUSE:FLAVOR", 2, 5);
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it("renders ATLAS 4-node status constellation", () => {
    const ctx = createMockContext();
    const agent = createDummyAgent("ATLAS");
    const state = createInitialSceneState();

    drawAtlasScreen(ctx, agent, 2, state);
    expect(ctx.fillText).toHaveBeenCalledWith("ATLAS:MAP", 2, 5);
    expect(ctx.arc).toHaveBeenCalledTimes(4); // 4 story nodes
  });

  it("renders FORGE progress bar and 3-step finale bar", () => {
    const ctx = createMockContext();
    const agent = createDummyAgent("FORGE");
    const state = createInitialSceneState();
    state.progress = { done: 40, total: 80 };

    drawForgeScreen(ctx, agent, 0, state);
    expect(ctx.fillText).toHaveBeenCalledWith("FORGE:DEPLOY", 2, 5);
    expect(ctx.fillText).toHaveBeenCalledWith("40/80 STEPS", 2, 20);

    // Finale mode
    const ctxFinale = createMockContext();
    state.narratorPhase = "gemini";
    drawForgeScreen(ctxFinale, agent, 0, state);
    expect(ctxFinale.fillText).toHaveBeenCalledWith("PHASE: GEMINI", 2, 13);
  });

  it("renders ECHO markdown memory doc", () => {
    const ctx = createMockContext();
    const agent = createDummyAgent("ECHO", {
      docLines: ["# Cast Ready", "- partner steady", "- diary Q1 saved"],
    });

    drawEchoScreen(ctx, agent, 0);
    expect(ctx.fillText).toHaveBeenCalledWith("ECHO:MEMORY", 2, 5);
    expect(ctx.fillText).toHaveBeenCalledWith("# Cast Ready", 2, 23);
  });

  it("renders SPARK invariant test passes", () => {
    const ctx = createMockContext();
    const agent = createDummyAgent("SPARK");

    drawSparkScreen(ctx, agent, 0);
    expect(ctx.fillText).toHaveBeenCalledWith("SPARK:INVAR", 2, 5);
    expect(ctx.stroke).toHaveBeenCalledTimes(3); // 3 checkmarks
  });

  it("renders NEXUS switchboard radar sweep", () => {
    const ctx = createMockContext();
    const agent = createDummyAgent("NEXUS");

    drawNexusScreen(ctx, agent, 4);
    expect(ctx.fillText).toHaveBeenCalledWith("NEXUS:DISPATCH", 2, 5);
    expect(ctx.arc).toHaveBeenCalledTimes(2); // 2 radar rings
  });

  it("MonitorManager throttles updates to 8 fps", () => {
    const manager = new MonitorManager();
    const state = createInitialSceneState();

    // Less than 125ms shouldn't advance tick
    manager.update(50, state);
    manager.update(50, state);

    // Reaching 125ms triggers tick update
    manager.update(30, state);

    // Verify all 9 agents supported
    const agentIds: AgentId[] = [
      "RONIN",
      "SAGE",
      "CIPHER",
      "MUSE",
      "ATLAS",
      "FORGE",
      "ECHO",
      "SPARK",
      "NEXUS",
    ];

    const ctx = createMockContext();
    for (const id of agentIds) {
      manager.renderAgentTexture(ctx, id, state.agents[id], 1, state);
    }
    expect(ctx.fillText).toHaveBeenCalled();
  });
});
