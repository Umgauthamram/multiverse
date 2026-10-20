import { describe, it, expect } from "vitest";
import { TheaterDirector } from "@/lib/theater/director";
import { generateMockSceneLines } from "@/lib/scene/mockSceneStream";

describe("Phase 3: Theater Director Pacing & Reveal Gate", () => {
  it("buffers incoming lines and dispatches them across sub-beats as simulated clock advances", () => {
    let mockTime = 1000;
    const dispatchedLines: string[] = [];

    const director = new TheaterDirector({
      now: () => mockTime,
      beatMs: 6500,
      staggerMs: 500,
      onLineDispatched: (l) => dispatchedLines.push(l),
    });

    // Ingest lines for Q1
    const lines = [
      "@* BOOT sess=test_sess stories=1 quarters=20",
      '@S1 FORK opt=A seed=bold label="London AI" loc="London, UK"',
      '@S1/Q1 ROLL ev=promotion sev=pos title="Promotion"',
      "@S1/Q1 CALC cash0=25000 inc=5000 exp=2500 evc=2000 cash1=34500",
      "@S1/Q1 THINK prov=groq",
      "@S1/Q1 DELTA joy=+5 hp=-2 rel=-1 car=+8",
      "@S1/Q1 CLAMP joy=70 hp=68 rel=64 car=68 hit=none",
      "@S1/Q1 STATUS st=thriving burn=0",
      '@S1/Q1 SAY who=you text="Quarter 1 complete."',
      "@S1/Q1 DONE",
    ];

    director.ingestLines(lines);

    // Initial immediate lines (BOOT, FORK) are applied on ingest
    expect(dispatchedLines).toHaveLength(2);
    expect(dispatchedLines[0]).toContain("BOOT");
    expect(dispatchedLines[1]).toContain("FORK");

    // Advance 500ms (event sub-beat: ROLL starts at 0)
    mockTime += 500;
    director.tick();
    expect(dispatchedLines.some((l) => l.includes("ROLL"))).toBe(true);

    // Advance past 1100ms (math sub-beat: CALC starts at 1100)
    mockTime += 1200;
    director.tick();
    expect(dispatchedLines.some((l) => l.includes("CALC"))).toBe(true);

    // Advance past 2400ms (think sub-beat: THINK starts at 2400)
    mockTime += 1200;
    director.tick();
    expect(dispatchedLines.some((l) => l.includes("THINK"))).toBe(true);

    // Advance past 3600ms (result sub-beat: DELTA, CLAMP starts at 3600)
    mockTime += 1300;
    director.tick();
    expect(dispatchedLines.some((l) => l.includes("DELTA"))).toBe(true);
    expect(dispatchedLines.some((l) => l.includes("CLAMP"))).toBe(true);

    // Advance past 5000ms (story sub-beat: STATUS, SAY, DONE starts at 5000)
    mockTime += 1500;
    director.tick();
    expect(dispatchedLines.some((l) => l.includes("STATUS"))).toBe(true);
    expect(dispatchedLines.some((l) => l.includes("SAY"))).toBe(true);
    expect(dispatchedLines.some((l) => l.includes("DONE"))).toBe(true);

    // Advance past total beat duration (6500ms) to finalize quarter
    mockTime += 1500;
    director.tick();

    // Final state reflects Quarter 1 completion
    const state = director.getState();
    expect(state.stories.S1.quarter).toBe(1);
    expect(state.stories.S1.currentSavings).toBe(34500);
  });

  it("staggers playback across multiple stories", () => {
    let mockTime = 1000;
    const dispatchedLines: string[] = [];

    const director = new TheaterDirector({
      now: () => mockTime,
      beatMs: 6500,
      staggerMs: 600,
      onLineDispatched: (l) => dispatchedLines.push(l),
    });

    const lines = [
      '@S1 FORK opt=A seed=bold label="London AI" loc="London, UK"',
      '@S2 FORK opt=A seed=anxious label="London AI" loc="London, UK"',
      '@S1/Q1 ROLL ev=steady sev=neu title="Steady S1"',
      "@S1/Q1 DONE",
      '@S2/Q1 ROLL ev=steady sev=neu title="Steady S2"',
      "@S2/Q1 DONE",
    ];

    director.ingestLines(lines);

    // S1 has stagger = 0ms; S2 has stagger = 600ms
    // At elapsed 100ms: S1 starts, S2 has not started yet
    mockTime += 100;
    director.tick();

    expect(dispatchedLines.some((l) => l.includes("Steady S1"))).toBe(true);
    expect(dispatchedLines.some((l) => l.includes("Steady S2"))).toBe(false);

    // At elapsed 700ms (after 600ms stagger): S2 starts playing
    mockTime += 600;
    director.tick();

    expect(dispatchedLines.some((l) => l.includes("Steady S2"))).toBe(true);
  });

  it("skip() instantly drains all buffered and pending lines to reach the final state", () => {
    let revealCalled = false;
    const director = new TheaterDirector({
      onRevealReady: () => {
        revealCalled = true;
      },
    });

    // Ingest complete 4x20 stream
    const allLines = generateMockSceneLines();
    director.ingestLines(allLines);

    expect(director.isRevealReady()).toBe(false);

    // Call skip
    director.skip();

    expect(director.isRevealReady()).toBe(true);
    expect(revealCalled).toBe(true);

    const state = director.getState();
    expect(state.isFinished).toBe(true);
    expect(state.stories.S1.quarter).toBe(20);
    expect(state.stories.S2.quarter).toBe(20);
    expect(state.stories.S3.quarter).toBe(20);
    expect(state.stories.S4.quarter).toBe(20);
    expect(state.stories.S1.finished).toBe(true);
  });

  it("reveal gate holds until FINISH is received and all queues are drained", () => {
    let mockTime = 1000;
    let revealCalled = false;

    const director = new TheaterDirector({
      now: () => mockTime,
      beatMs: 1000,
      staggerMs: 100,
      onRevealReady: () => {
        revealCalled = true;
      },
    });

    const lines = [
      '@S1 FORK opt=A seed=bold label="London AI" loc="London, UK"',
      '@S1/Q1 ROLL ev=steady sev=neu title="Steady"',
      "@S1/Q1 DONE",
    ];

    director.ingestLines(lines);

    // Start Q1
    mockTime += 100;
    director.tick();

    // Advance clock past Q1 duration (beatMs = 1000)
    mockTime += 1200;
    director.tick();

    // S1/Q1 is playing/drained, but FINISH has not arrived yet
    expect(director.isRevealReady()).toBe(false);
    expect(revealCalled).toBe(false);

    // Now ingest FINISH
    director.ingestLines(["@* FINISH"]);
    director.tick();

    expect(director.isRevealReady()).toBe(true);
    expect(revealCalled).toBe(true);
  });
});
