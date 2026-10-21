import { describe, it, expect } from "vitest";
import { AGENT_OFFICE } from "@/lib/theater/layout";
import { AGENT_ROSTER_INFO, THEATER_PALETTE } from "@/lib/theater/tokens";
import { TheaterRenderer } from "@/lib/theater/renderer";
import { createInitialSceneState, reduceSceneState } from "@/lib/theater/sceneState";

describe("Phase 5: Agent Office & Inter-Agent Coordination", () => {
  it("maps all 9 agents to their respective desk anchors and roles", () => {
    const agents = Object.keys(AGENT_ROSTER_INFO);
    expect(agents).toHaveLength(9);

    for (const [id, info] of Object.entries(AGENT_ROSTER_INFO)) {
      expect(info.name).toBe(id);
      expect(info.role).toBeDefined();
      expect(info.accent).toBe(THEATER_PALETTE.agentAccents[id as keyof typeof THEATER_PALETTE.agentAccents]);

      if (id === "NEXUS") {
        expect(AGENT_OFFICE.anchors.reception).toBeDefined();
      } else {
        const anchorKey = `desk_${id}` as keyof typeof AGENT_OFFICE.anchors;
        expect(AGENT_OFFICE.anchors[anchorKey]).toBeDefined();
      }
    }
  });

  it("handles handoff packet state between agents during quarter pipeline", () => {
    let state = createInitialSceneState();
    state = reduceSceneState(state, "@* BOOT sess=sess_123 stories=4 quarters=20");
    state = reduceSceneState(state, '@S1 FORK opt=A seed=bold label="London Tech" loc="London, UK"');

    // 1. ROLL sets handoff MUSE -> CIPHER
    state = reduceSceneState(state, '@S1/Q1 ROLL ev=promo sev=pos title="Promotion"');
    expect(state.activeHandoff).toEqual({
      fromAgent: "MUSE",
      toAgent: "CIPHER",
      storyId: "S1",
      quarter: 1,
    });

    // 2. CALC sets handoff CIPHER -> RONIN
    state = reduceSceneState(state, "@S1/Q1 CALC cash0=25000 inc=5000 exp=3000 evc=2000 cash1=33000");
    expect(state.activeHandoff).toEqual({
      fromAgent: "CIPHER",
      toAgent: "RONIN",
      storyId: "S1",
      quarter: 1,
    });

    // 3. DELTA sets handoff RONIN -> SPARK
    state = reduceSceneState(state, "@S1/Q1 DELTA joy=5 hp=-2 rel=1 car=8");
    expect(state.activeHandoff).toEqual({
      fromAgent: "RONIN",
      toAgent: "SPARK",
      storyId: "S1",
      quarter: 1,
    });

    // 4. CLAMP sets handoff SPARK -> ECHO
    state = reduceSceneState(state, "@S1/Q1 CLAMP joy=70 hp=68 rel=66 car=68 hit=none");
    expect(state.activeHandoff).toEqual({
      fromAgent: "SPARK",
      toAgent: "ECHO",
      storyId: "S1",
      quarter: 1,
    });
  });

  it("coordinates NEXUS walking behaviors on FORK and FINISH", () => {
    const renderer = new TheaterRenderer();
    let state = createInitialSceneState();

    // Before fork, initial update
    renderer.update(16, state);

    // On FORK, NEXUS initiates walk to stairs
    state = reduceSceneState(state, '@S1 FORK opt=A seed=bold label="London Tech" loc="London, UK"');
    renderer.update(16, state);

    // Advance time for NEXUS to walk towards stairs
    renderer.update(3000, state);

    // On FINISH, NEXUS walks to Life Wing corridor
    state = reduceSceneState(state, "@* FINISH");
    renderer.update(16, state);

    // Advance time for corridor walk
    renderer.update(3000, state);

    renderer.destroy();
  });
});
