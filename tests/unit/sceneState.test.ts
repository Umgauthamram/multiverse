import { describe, it, expect } from "vitest";
import {
  createInitialSceneState,
  reduceSceneState,
} from "@/lib/theater/sceneState";

describe("Phase 3: Scene State Reducer", () => {
  it("initializes default state with 9 agents and empty stories", () => {
    const state = createInitialSceneState();
    expect(state.session).toBeNull();
    expect(state.progress.done).toBe(0);
    expect(state.progress.total).toBe(80);
    expect(Object.keys(state.agents)).toHaveLength(9);
    expect(state.agents.RONIN.name).toBe("RONIN");
    expect(state.agents.NEXUS.name).toBe("NEXUS");
    expect(state.agents.CIPHER.accent).toBe("#00E676");
    expect(Object.keys(state.stories)).toHaveLength(0);
    expect(state.ticker).toHaveLength(0);
  });

  it("reduces BOOT line and updates session & NEXUS agent", () => {
    const state0 = createInitialSceneState();
    const state1 = reduceSceneState(state0, "@* BOOT sess=sess_123 stories=4 quarters=20");

    expect(state1.session?.sessionId).toBe("sess_123");
    expect(state1.session?.stories).toBe(4);
    expect(state1.session?.quarters).toBe(20);
    expect(state1.agents.NEXUS.statusTag).toBe("ready");
    expect(state1.ticker.length).toBeGreaterThan(0);
    expect(state1.ticker[0].text).toContain("4 lives x 20 quarters");
  });

  it("reduces FORK line to seed a story with initial tiers", () => {
    const state0 = createInitialSceneState();
    const line = '@S1 FORK opt=A seed=bold label="London AI" loc="London, UK"';
    const state1 = reduceSceneState(state0, line);

    const s1 = state1.stories["S1"];
    expect(s1).toBeDefined();
    expect(s1.storyId).toBe("S1");
    expect(s1.branchOption).toBe("A");
    expect(s1.personaSeed).toBe("bold");
    expect(s1.label).toBe("London AI");
    expect(s1.location).toBe("London, UK");
    expect(s1.currentSavings).toBe(25000);
    expect(s1.coinTier).toBe(2); // 75..150% = 25000/25000 -> 1.0 ratio -> tier 2
    expect(state1.agents.ATLAS.statusTag).toContain("forked S1");
  });

  it("reduces CAST line to register NPC and update ECHO docs", () => {
    const state0 = createInitialSceneState();
    const line = '@* CAST role=partner name="Priya" trait=anxious';
    const state1 = reduceSceneState(state0, line);

    expect(state1.cast.partner).toBeDefined();
    expect(state1.cast.partner.name).toBe("Priya");
    expect(state1.cast.partner.trait).toBe("anxious");
    expect(state1.agents.ECHO.statusTag).toContain("cast Priya");
    expect(state1.agents.ECHO.monitorData.docLines).toContain("# Priya (partner, anxious)");
  });

  it("reduces full quarter lifecycle: ROLL -> CALC -> THINK -> DELTA -> CLAMP -> STATUS -> SAY -> DONE", () => {
    let state = createInitialSceneState();
    state = reduceSceneState(state, '@S1 FORK opt=A seed=bold label="London AI" loc="London, UK"');

    // 1. ROLL
    state = reduceSceneState(state, '@S1/Q1 ROLL ev=promotion sev=pos title="Promotion to Lead"');
    expect(state.stories.S1.currentEvent?.ev).toBe("promotion");
    expect(state.agents.MUSE.statusTag).toContain("working S1 Q1");
    expect(state.activeHandoff?.fromAgent).toBe("MUSE");
    expect(state.activeHandoff?.toAgent).toBe("CIPHER");

    // 2. CALC
    state = reduceSceneState(state, "@S1/Q1 CALC cash0=25000 inc=6000 exp=2500 evc=2000 cash1=37500");
    expect(state.stories.S1.currentSavings).toBe(37500);
    expect(state.stories.S1.coinTier).toBe(2); // 37500 / 25000 = 1.5 -> 75..150% is tier 2
    expect(state.agents.CIPHER.statusTag).toContain("working S1 Q1");
    expect(state.activeHandoff?.fromAgent).toBe("CIPHER");
    expect(state.activeHandoff?.toAgent).toBe("RONIN");

    // 3. THINK
    state = reduceSceneState(state, "@S1/Q1 THINK prov=groq");
    expect(state.agents.RONIN.statusTag).toContain("drafting S1 Q1");

    // 4. DELTA
    state = reduceSceneState(state, "@S1/Q1 DELTA joy=+5 hp=-3 rel=-2 car=+10");
    expect(state.stories.S1.statDeltas.car).toBe(10);
    expect(state.agents.RONIN.statusTag).toContain("delta S1 Q1");
    expect(state.activeHandoff?.fromAgent).toBe("RONIN");
    expect(state.activeHandoff?.toAgent).toBe("SPARK");

    // 5. CLAMP
    state = reduceSceneState(state, "@S1/Q1 CLAMP joy=70 hp=67 rel=63 car=70 hit=none");
    expect(state.stories.S1.stats.career).toBe(70);
    expect(state.stories.S1.careerDeskTier).toBe(2); // >= 70
    expect(state.stories.S1.clampedHit).toBe("none");
    expect(state.agents.SPARK.statusTag).toContain("clamped S1 Q1");
    expect(state.agents.SAGE.statusTag).toContain("working S1 Q1");
    expect(state.activeHandoff?.fromAgent).toBe("SPARK");
    expect(state.activeHandoff?.toAgent).toBe("ECHO");

    // 6. STATUS
    state = reduceSceneState(state, "@S1/Q1 STATUS st=thriving burn=0");
    expect(state.stories.S1.status).toBe("thriving");
    expect(state.stories.S1.isBurnedOut).toBe(false);
    expect(state.agents.ATLAS.statusTag).toContain("S1 thriving");

    // 7. SAY
    state = reduceSceneState(state, '@S1/Q1 SAY who=you text="Stepped up to tech lead role."');
    expect(state.stories.S1.lastDiary).toBe("Stepped up to tech lead role.");
    expect(state.agents.ECHO.statusTag).toContain("archived S1 Q1");

    // 8. DONE
    state = reduceSceneState(state, "@S1/Q1 DONE");
    expect(state.stories.S1.quarter).toBe(1);
    expect(state.activeHandoff).toBeNull();
  });

  it("drops unknown verbs and invalid syntax gracefully without mutating state", () => {
    const state0 = createInitialSceneState();
    const state1 = reduceSceneState(state0, "@* UNKNOWN_VERB foo=bar");
    expect(state1).toEqual(state0);

    const state2 = reduceSceneState(state0, "INVALID LINE SYNTAX");
    expect(state2).toEqual(state0);
  });

  it("handles REROUTE, ERROR, NARRATE, and FINISH lines", () => {
    let state = createInitialSceneState();

    state = reduceSceneState(state, "@* REROUTE from=groq to=nvidia");
    expect(state.agents.NEXUS.statusTag).toContain("rerouting to nvidia");
    expect(state.agents.NEXUS.speechBubble).toContain("rerouting to nvidia");

    state = reduceSceneState(state, "@* NARRATE phase=digest");
    expect(state.narratorPhase).toBe("digest");
    expect(state.agents.FORGE.statusTag).toContain("narrating: digest");

    state = reduceSceneState(state, "@* FINISH");
    expect(state.isFinished).toBe(true);
    expect(state.agents.NEXUS.statusTag).toBe("complete");
  });
});
