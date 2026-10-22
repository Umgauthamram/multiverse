import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { LiveTicker } from "@/components/theater/LiveTicker";
import { StoryFocusBar } from "@/components/theater/StoryFocusBar";
import { TheaterCanvas } from "@/components/theater/TheaterCanvas";
import { TheaterView } from "@/components/theater/TheaterView";
import { createInitialSceneState, TickerItem, StorySceneState } from "@/lib/theater/sceneState";
import { assertAntiSlopCompliance } from "@/lib/design/antiSlopGuard";

describe("Phase 7: Theater UI, Live Ticker, Focus Camera & Accessibility", () => {
  const sampleTickerItems: TickerItem[] = [
    {
      id: "1",
      scope: "@*",
      verb: "BOOT",
      text: "Session ready: 4 lives x 20 quarters",
      timestamp: Date.now(),
    },
    {
      id: "2",
      scope: "@S1",
      storyId: "S1",
      verb: "FORK",
      text: "S1 forked: London AI Founder (bold)",
      timestamp: Date.now() + 100,
    },
    {
      id: "3",
      scope: "@S2/Q1",
      storyId: "S2",
      verb: "CALC",
      text: "S2 Q1 25000 + (3500 - 2200) x 3 + 0 = 28900",
      timestamp: Date.now() + 200,
    },
    {
      id: "4",
      scope: "@S3/Q1",
      storyId: "S3",
      verb: "STATUS",
      text: "S3 Q1 status: thriving",
      timestamp: Date.now() + 300,
    },
    {
      id: "5",
      scope: "@*",
      verb: "REROUTE",
      text: "Provider groq busy, rerouting to nvidia",
      timestamp: Date.now() + 400,
    },
  ];

  describe("LiveTicker Component", () => {
    it("renders live ticker feed with story badges and formatted texts", () => {
      const html = renderToString(
        <LiveTicker ticker={sampleTickerItems} />
      );

      expect(html).toContain("Live Ticker");
      expect(html).toContain("5 events");
      expect(html).toContain("Session ready: 4 lives x 20 quarters");
      expect(html).toContain("S1 forked: London AI Founder (bold)");
      expect(html).toContain("S2 Q1 25000 + (3500 - 2200) x 3 + 0 = 28900");
      expect(html).toContain("Provider groq busy, rerouting to nvidia");
    });

    it("includes accessible filter tabs with role='tablist'", () => {
      const html = renderToString(
        <LiveTicker ticker={sampleTickerItems} />
      );

      expect(html).toContain('role="tablist"');
      expect(html).toContain('role="tab"');
      expect(html).toContain("All");
      expect(html).toContain("S1: Bold");
      expect(html).toContain("S2: Anxious");
      expect(html).toContain("S3: Balanced");
      expect(html).toContain("S4: Workaholic");
      expect(html).toContain("Agents");
    });

    it("provides polite aria-live announcement container for screen readers (Section 8.5)", () => {
      const html = renderToString(
        <LiveTicker ticker={sampleTickerItems} />
      );

      expect(html).toContain('aria-live="polite"');
      expect(html).toContain('data-testid="ticker-aria-live"');
    });

    it("displays empty state when ticker item array is empty", () => {
      const html = renderToString(
        <LiveTicker ticker={[]} />
      );

      expect(html).toContain("Awaiting simulation events...");
    });
  });

  describe("StoryFocusBar Component", () => {
    const sampleStories: Record<string, StorySceneState> = {
      S1: {
        storyId: "S1",
        branchOption: "A",
        personaSeed: "bold",
        label: "London Startup",
        location: "London",
        quarter: 5,
        initialSavings: 25000,
        currentSavings: 38000,
        stats: { happiness: 75, health: 80, relationships: 65, career: 85 },
        statDeltas: { joy: 2, hp: 0, rel: -1, car: 3 },
        clampedHit: "none",
        status: "thriving",
        isBurnedOut: false,
        currentEvent: null,
        lastDiary: null,
        coinTier: 2,
        happinessTier: "happy",
        healthTier: "normal",
        relPhotoTier: 2,
        careerDeskTier: 2,
        finished: false,
      },
      S2: {
        storyId: "S2",
        branchOption: "A",
        personaSeed: "anxious",
        label: "London Corporate",
        location: "London",
        quarter: 5,
        initialSavings: 25000,
        currentSavings: 22000,
        stats: { happiness: 45, health: 50, relationships: 55, career: 60 },
        statDeltas: { joy: -2, hp: -1, rel: 0, car: 1 },
        clampedHit: "none",
        status: "plateau",
        isBurnedOut: false,
        currentEvent: null,
        lastDiary: null,
        coinTier: 1,
        happinessTier: "neutral",
        healthTier: "normal",
        relPhotoTier: 1,
        careerDeskTier: 1,
        finished: false,
      },
    };

    it("renders Overview button with Esc keyboard indicator and story selectors", () => {
      const html = renderToString(
        <StoryFocusBar
          stories={sampleStories}
          focusedStoryId={null}
          onFocusChange={() => {}}
        />
      );

      expect(html).toContain('role="toolbar"');
      expect(html).toContain("Overview");
      expect(html).toContain("Esc");
      expect(html).toContain("S1");
      expect(html).toContain("London Startup");
      expect(html).toContain("thriving");
      expect(html).toContain("S2");
      expect(html).toContain("London Corporate");
      expect(html).toContain("plateau");
    });
  });

  describe("TheaterCanvas Component", () => {
    it("renders HTML5 canvas with role='img' and descriptive aria-label", () => {
      const state = createInitialSceneState();
      state.progress = { done: 20, total: 80 };

      const html = renderToString(
        <TheaterCanvas sceneState={state} focusedStoryId={null} />
      );

      expect(html).toContain('role="img"');
      expect(html).toContain('aria-label="Multiverse Theater live visualization: Quarter 5 of 20 with 4 stories and 9 simulation agents running"');
      expect(html).toContain('data-testid="theater-canvas-container"');
    });
  });

  describe("TheaterView Master Component", () => {
    it("renders full theater shell with header, safety line, and honest status chip", () => {
      const html = renderToString(
        <TheaterView
          useMock={true}
          sessionId="test-session"
        />
      );

      // Title & Mandatory framing lines (Rule 7, Section 11)
      expect(html).toContain("Multiverse Theater");
      expect(html).toContain("Reflective Simulation Engine, Not a Future Prediction");

      // Quarter Tracker
      expect(html).toContain("Quarter");
      expect(html).toContain("Month");

      // Mobile Agent Office representation for 9 agents (Section 8.4)
      expect(html).toContain("RONIN");
      expect(html).toContain("SAGE");
      expect(html).toContain("CIPHER");
      expect(html).toContain("MUSE");
      expect(html).toContain("ATLAS");
      expect(html).toContain("FORGE");
      expect(html).toContain("ECHO");
      expect(html).toContain("SPARK");
      expect(html).toContain("NEXUS");

      // Both Canvas and Ticker mounts
      expect(html).toContain('data-testid="theater-canvas-container"');
      expect(html).toContain('data-testid="live-ticker"');
    });

    it("strictly adheres to Anti-AI-Slop and restrained dark palette rules", () => {
      const html = renderToString(
        <TheaterView useMock={true} sessionId="test-session" />
      );

      // Assert no confetti, sparkles, emoji, or purple/cyan slop gradients in DOM markup
      expect(() => assertAntiSlopCompliance(html)).not.toThrow();
    });
  });
});
