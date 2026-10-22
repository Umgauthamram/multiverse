import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { LifeCards, LifeCardStoryData } from "@/components/theater/LifeCards";
import { assertAntiSlopCompliance } from "@/lib/design/antiSlopGuard";

describe("Theater Phase 8: Life Cards & Reveal Presentation", () => {
  const sampleStories: LifeCardStoryData[] = [
    {
      storyId: "S1",
      branchOption: "A",
      branchName: "London AI Startup",
      branchLocation: "London, UK",
      personaSeed: "bold",
      finalSavings: 45000,
      finalStats: {
        happiness: 72,
        health: 68,
        relationships: 60,
        career: 85,
      },
      status: "thriving",
      lastDiaryEntry: "Celebrated funding milestone with the founding team late into the evening.",
      completedQuarters: 20,
      totalQuarters: 20,
      isPartial: false,
    },
    {
      storyId: "S2",
      branchOption: "A",
      branchName: "London AI Startup",
      branchLocation: "London, UK",
      personaSeed: "anxious",
      finalSavings: 38000,
      finalStats: {
        happiness: 42,
        health: 50,
        relationships: 45,
        career: 78,
      },
      status: "struggling",
      lastDiaryEntry: "The relentless pace is taking a toll on my sleep, but the product is shipping.",
      completedQuarters: 14,
      totalQuarters: 20,
      isPartial: true,
    },
    {
      storyId: "S3",
      branchOption: "B",
      branchName: "Delhi Corporate Lead",
      branchLocation: "Delhi, India",
      personaSeed: "balanced",
      finalSavings: 32000,
      finalStats: {
        happiness: 80,
        health: 82,
        relationships: 85,
        career: 70,
      },
      status: "thriving",
      lastDiaryEntry: "Weekend dinner with family reminded me why proximity matters.",
      completedQuarters: 20,
      totalQuarters: 20,
      isPartial: false,
    },
    {
      storyId: "S4",
      branchOption: "B",
      branchName: "Delhi Corporate Lead",
      branchLocation: "Delhi, India",
      personaSeed: "workaholic",
      finalSavings: 52000,
      finalStats: {
        happiness: 58,
        health: 48,
        relationships: 52,
        career: 88,
      },
      status: "plateau",
      lastDiaryEntry: "Promoted to engineering director. The title feels earned, if exhausting.",
      completedQuarters: 20,
      totalQuarters: 20,
      isPartial: false,
    },
  ];

  it("renders 4 complete life cards with persona seeds, paths, net worth, and 4 stat bars", () => {
    const html = renderToString(
      <LifeCards
        stories={sampleStories}
        onCompareAll={() => {}}
        onReplayTheater={() => {}}
        onOpenTimeline={() => {}}
      />
    );

    const cleanHtml = html.replace(/<!--.*?-->/g, "");

    // Section header
    expect(cleanHtml).toContain("Simulation Complete • 4 Parallel Lives Revealed");
    expect(cleanHtml).toContain("Compare 5-year trajectories across divergent persona temperaments");

    // Story S1 checks
    expect(cleanHtml).toContain('data-testid="life-card-S1"');
    expect(cleanHtml).toContain("S1 • Path A");
    expect(cleanHtml).toContain("London AI Startup");
    expect(cleanHtml).toContain("London, UK");
    expect(cleanHtml).toContain("bold");
    expect(cleanHtml).toContain("Thriving");
    expect(cleanHtml).toContain("$45,000");
    expect(cleanHtml).toContain("72/100");
    expect(cleanHtml).toContain("85/100");
    expect(cleanHtml).toContain("Celebrated funding milestone with the founding team");

    // Story S3 checks
    expect(cleanHtml).toContain('data-testid="life-card-S3"');
    expect(cleanHtml).toContain("S3 • Path B");
    expect(cleanHtml).toContain("Delhi Corporate Lead");
    expect(cleanHtml).toContain("Delhi, India");
    expect(cleanHtml).toContain("balanced");
    expect(cleanHtml).toContain("$32,000");
    expect(cleanHtml).toContain("80/100");

    // Primary & Secondary Buttons
    expect(cleanHtml).toContain("Compare All 4 Futures");
    expect(cleanHtml).toContain("Replay Theater");
    expect(cleanHtml).toContain('data-testid="compare-all-btn"');
    expect(cleanHtml).toContain('data-testid="replay-theater-btn"');
    expect(cleanHtml).toContain('data-testid="open-timeline-btn-S1"');
    expect(cleanHtml).toContain('data-testid="open-timeline-btn-S4"');
  });

  it("flags partial/incomplete stories clearly without crashing", () => {
    const html = renderToString(
      <LifeCards
        stories={sampleStories}
        onCompareAll={() => {}}
      />
    );

    const cleanHtml = html.replace(/<!--.*?-->/g, "");

    // S2 is partial (14 of 20 quarters)
    expect(cleanHtml).toContain('data-testid="partial-warning-S2"');
    expect(cleanHtml).toContain("Incomplete: 14 of 20 quarters");

    // S1 is complete (no warning)
    expect(cleanHtml).not.toContain('data-testid="partial-warning-S1"');
  });

  it("strictly adheres to Anti-AI-Slop and restrained dark palette rules", () => {
    const html = renderToString(
      <LifeCards
        stories={sampleStories}
        onCompareAll={() => {}}
        onReplayTheater={() => {}}
      />
    );

    expect(() => assertAntiSlopCompliance(html)).not.toThrow();
  });
});
