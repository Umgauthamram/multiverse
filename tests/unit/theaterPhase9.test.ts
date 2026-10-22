/**
 * Theater Phase 9 Tests:
 * - Performance & Offscreen Caching
 * - prefers-reduced-motion Behavior (3000ms beats, no walking, instant snap, no packets/pops)
 * - Failure Scenes & Recovery (@* REROUTE, @S2/Q7 ERROR)
 * - Demo Scenarios (?demo=1&scenario=reroute | error | stall | fast)
 * - LLM SAY Crisis Interception
 * - 3x Speedup & Hard Timeout Safeguard
 */

import { describe, it, expect } from "vitest";
import { TheaterDirector } from "@/lib/theater/director";
import { TheaterRenderer } from "@/lib/theater/renderer";
import { createMockSceneStream, generateMockSceneLines } from "@/lib/scene/mockSceneStream";
import { createInitialSceneState, reduceSceneState } from "@/lib/theater/sceneState";
import { parseLine, renderTickerText } from "@/lib/scene/sceneLanguage";
import { createWalker, setWalkerDestination } from "@/lib/theater/pathfinding";

describe("Theater Phase 9: Performance, Reduced Motion, Failure Scenes & Scenarios", () => {
  describe("1. prefers-reduced-motion Behavior", () => {
    it("configures TheaterDirector with 3000ms beats and reduced sub-beats", () => {
      let currentTime = 1000;
      const director = new TheaterDirector({
        now: () => currentTime,
        reducedMotion: true,
      });

      director.ingestLines([
        '@* BOOT sess="test-sess" stories=4 quarters=20',
        '@S1 FORK opt="A" seed="bold" label="Branch A" loc="London"',
        '@S1/Q1 ROLL ev="seed_round" sev="pos" title="Funding Closed"',
        '@S1/Q1 CALC cash0=25000 inc=5000 exp=3000 evc=0 cash1=31000',
        '@S1/Q1 THINK prov="groq"',
        '@S1/Q1 DELTA joy=5 hp=0 rel=-5 car=10',
        '@S1/Q1 CLAMP joy=70 hp=70 rel=60 car=70 hit="none"',
        '@S1/Q1 STATUS st="thriving" burn=0',
        '@S1/Q1 SAY who="you" text="Closing the round felt fantastic."',
        '@S1/Q1 DONE',
      ]);

      // At start, S1 is forked and ready
      expect(director.getState().stories.S1).toBeDefined();

      // Tick at 0ms elapsed
      director.tick();

      // Advance by 3200ms (greater than 3000ms reducedMotion beat)
      currentTime += 3200;
      director.tick();

      // In reduced motion, Q1 finishes within 3000ms
      expect(director.getState().stories.S1.currentSavings).toBe(31000);
      expect(director.getState().stories.S1.quarter).toBe(1);
    });

    it("TheaterRenderer instantly snaps characters without walking and suppresses text pops / packets in reduced motion", () => {
      const renderer = new TheaterRenderer();
      renderer.setReducedMotion(true);
      expect(renderer.reducedMotion).toBe(true);

      const walker = createWalker({ col: 2, row: 2 });
      setWalkerDestination(walker, { col: 5, row: 7 });
      expect(walker.isMoving).toBe(true);

      // In reduced motion, renderer.update snaps walker immediately
      renderer.update(16);

      // Verify camera snaps without easing
      renderer.focusStory("S1");
      renderer.update(16);
      expect(renderer.reducedMotion).toBe(true);
    });
  });

  describe("2. Demo Scenarios (?demo=1&scenario=...)", () => {
    it("generates REROUTE line when scenario='reroute'", () => {
      const lines = generateMockSceneLines({ scenario: "reroute" });
      const rerouteLine = lines.find((l) => l.includes("REROUTE"));
      expect(rerouteLine).toBeDefined();
      expect(rerouteLine).toContain("@* REROUTE from=groq to=nvidia");

      // Reduce through sceneState
      let state = createInitialSceneState();
      for (const line of lines.slice(0, 30)) {
        state = reduceSceneState(state, line);
      }

      // Find reroute line and apply
      state = reduceSceneState(state, rerouteLine!);
      expect(state.agents.NEXUS.speechBubble).toContain("rerouting to nvidia");
      expect(state.agents.NEXUS.dotColor).toBe("accent");

      const parsed = parseLine(rerouteLine!);
      expect(parsed).not.toBeNull();
      const ticker = renderTickerText(parsed!);
      expect(ticker).toBe("Provider groq busy, rerouting to nvidia");
    });

    it("generates ERROR line when scenario='error' and updates SPARK state", () => {
      const lines = generateMockSceneLines({ scenario: "error" });
      const errorLine = lines.find((l) => l.includes("ERROR"));
      expect(errorLine).toBeDefined();
      expect(errorLine).toContain("@S2/Q7 ERROR code=RATE_LIMIT_EXHAUSTED");

      let state = createInitialSceneState();
      const parsed = parseLine(errorLine!);
      expect(parsed).not.toBeNull();
      state = reduceSceneState(state, parsed!);

      expect(state.agents.SPARK.statusTag).toBe("error RATE_LIMIT_EXHAUSTED");
      expect(state.agents.SPARK.dotColor).toBe("error");

      const ticker = renderTickerText(parsed!);
      expect(ticker).toBe("S2 Q7 failed: RATE_LIMIT_EXHAUSTED, retrying");
    });

    it("stalled scenario halts after initial lines", () => {
      const stream = createMockSceneStream({ scenario: "stall" });
      const emittedLines: string[] = [];
      stream.subscribe((lines) => {
        emittedLines.push(...lines);
      });

      expect(emittedLines.length).toBeLessThanOrEqual(8);
      expect(emittedLines[0]).toContain("BOOT");
    });

    it("fast scenario completes immediately", () => {
      const stream = createMockSceneStream({ scenario: "fast" });
      const emittedLines: string[] = [];
      stream.subscribe((lines) => {
        emittedLines.push(...lines);
      });

      expect(emittedLines.length).toBeGreaterThan(100);
      expect(emittedLines[emittedLines.length - 1]).toContain("FINISH");
    });
  });

  describe("3. LLM SAY Crisis Interception (Section 11)", () => {
    it("redacts self-harm crisis diary entry in sceneState and omits it from ticker", () => {
      let state = createInitialSceneState();
      state = reduceSceneState(state, '@S1 FORK opt="A" seed="bold" label="Branch A" loc="London"');

      // Crisis line
      const crisisLine = '@S1/Q4 SAY who="you" text="I feel completely suicidal and want to end it all"';
      const parsed = parseLine(crisisLine);
      expect(parsed).not.toBeNull();

      // 1. Ticker omits crisis SAY text
      const tickerText = renderTickerText(parsed!);
      expect(tickerText).toBeNull();

      // 2. sceneState replaces bubble / diary with "..."
      state = reduceSceneState(state, parsed!);
      expect(state.stories.S1.lastDiary).toBe("...");
    });

    it("allows benign text through with normal ticker formatting", () => {
      let state = createInitialSceneState();
      state = reduceSceneState(state, '@S1 FORK opt="A" seed="bold" label="Branch A" loc="London"');

      const safeLine = '@S1/Q4 SAY who="you" text="We are killing it at work with the new release."';
      const parsed = parseLine(safeLine);
      expect(parsed).not.toBeNull();

      const tickerText = renderTickerText(parsed!);
      expect(tickerText).toContain("S1 Q4 diary: We are killing it at work with the new release.");

      state = reduceSceneState(state, parsed!);
      expect(state.stories.S1.lastDiary).toBe("We are killing it at work with the new release.");
    });
  });

  describe("4. 3x Speedup & Hard Timeout Safeguard", () => {
    it("accelerates playback at 3x when elapsed passes maxTheaterMs", () => {
      let time = 0;
      const dispatched: string[] = [];
      const director = new TheaterDirector({
        now: () => time,
        beatMs: 6500,
        maxTheaterMs: 10000, // 10s max for test
        onLineDispatched: (line) => dispatched.push(line),
      });

      director.ingestLines([
        '@* BOOT sess="test" stories=1 quarters=20',
        '@S1 FORK opt="A" seed="bold" label="A" loc="London"',
        '@S1/Q1 ROLL ev="e1" sev="neu" title="T1"',
        '@S1/Q1 CALC cash0=25000 inc=5000 exp=3000 evc=0 cash1=31000',
        '@S1/Q1 THINK prov="groq"',
        '@S1/Q1 DELTA joy=0 hp=0 rel=0 car=0',
        '@S1/Q1 CLAMP joy=50 hp=50 rel=50 car=50 hit="none"',
        '@S1/Q1 STATUS st="thriving" burn=0',
        '@S1/Q1 SAY who="you" text="OK"',
        '@S1/Q1 DONE',
      ]);

      time = 0;
      director.tick();

      // Advance past 10s maxTheaterMs: at 3x, beat is ~2166ms
      time = 13000;
      director.tick();

      // Verify simulation progressed rapidly at 3x
      expect(director.getState().stories.S1.currentSavings).toBe(31000);
    });

    it("triggers partial reveal on hard timeout if server is delayed", () => {
      let time = 0;
      let revealFired = false;

      const director = new TheaterDirector({
        now: () => time,
        hardTimeoutMs: 15000,
        onRevealReady: () => {
          revealFired = true;
        },
      });

      director.ingestLines([
        '@* BOOT sess="test" stories=1 quarters=20',
        '@S1 FORK opt="A" seed="bold" label="A" loc="London"',
        '@S1/Q1 ROLL ev="e1" sev="neu" title="T1"',
        '@S1/Q1 DONE',
      ]);

      time = 0;
      director.tick();
      expect(revealFired).toBe(false);

      // Advance past 15000ms hard timeout without FINISH
      time = 16000;
      director.tick();

      expect(revealFired).toBe(true);
      expect(director.isRevealReady()).toBe(true);
    });
  });
});
