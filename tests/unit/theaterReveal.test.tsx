import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { TheaterView } from "@/components/theater/TheaterView";
import { assertAntiSlopCompliance } from "@/lib/design/antiSlopGuard";

describe("Theater Phase 8: Reveal Sequence & Replay Flow", () => {
  it("renders TheaterView with LifeCards integrated during reveal", () => {
    const onRevealComplete = vi.fn();
    const onOpenTimeline = vi.fn();

    const html = renderToString(
      <TheaterView
        useMock={true}
        sessionId="test-reveal-session"
        onRevealComplete={onRevealComplete}
        onOpenTimeline={onOpenTimeline}
      />
    );

    // Initial state check
    expect(html).toContain('data-testid="theater-view"');
    expect(html).toContain('data-testid="theater-canvas-container"');
    expect(html).toContain('data-testid="live-ticker"');

    // Anti-slop verification
    assertAntiSlopCompliance(html);
  });
});
