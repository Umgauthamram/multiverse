import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  MultiverseTreeCanvas,
  TimelineTreeBranch,
  calculateMonthX,
  calculateBranchY,
  getStatusColor,
  STATUS_COLORS,
} from "@/components/tree/MultiverseTreeCanvas";
import { assertAntiSlopCompliance } from "@/lib/design/antiSlopGuard";

describe("Phase 22: 2D HTML5 Canvas Branching Tree Visualizer", () => {
  const sampleBranches: TimelineTreeBranch[] = [
    {
      timelineId: "tl-a-bold",
      branchOption: "A",
      branchName: "London AI Startup",
      personaSeed: "bold",
      status: "thriving",
      nodes: [
        { quarter: 1, month: 3, status: "thriving", happiness: 75 },
        { quarter: 2, month: 6, status: "plateau", happiness: 68 },
        { quarter: 3, month: 9, status: "thriving", happiness: 82 },
      ],
    },
    {
      timelineId: "tl-b-anxious",
      branchOption: "B",
      branchName: "Delhi Corporate Lead",
      personaSeed: "anxious",
      status: "plateau",
      nodes: [
        { quarter: 1, month: 3, status: "plateau", happiness: 65 },
        { quarter: 2, month: 6, status: "struggling", happiness: 52 },
      ],
    },
  ];

  describe("Coordinate Math Helpers", () => {
    it("calculates horizontal X coordinates accurately across 0 to 60 months", () => {
      const width = 1000;
      const paddingLeft = 140;
      const paddingRight = 60;
      const availableWidth = width - paddingLeft - paddingRight; // 800

      // Month 0 should equal paddingLeft
      expect(calculateMonthX(0, width, paddingLeft, paddingRight)).toBe(140);

      // Month 60 should equal width - paddingRight (940)
      expect(calculateMonthX(60, width, paddingLeft, paddingRight)).toBe(940);

      // Month 30 should equal exact center of rail
      expect(calculateMonthX(30, width, paddingLeft, paddingRight)).toBe(140 + availableWidth / 2);

      // Bounds clamping for negative or over-60 months
      expect(calculateMonthX(-10, width, paddingLeft, paddingRight)).toBe(140);
      expect(calculateMonthX(75, width, paddingLeft, paddingRight)).toBe(940);
    });

    it("calculates distinct vertical Y levels for Option A and Option B branches", () => {
      const height = 600;
      const totalPerOption = 6;

      // Option A branches (0 to 5) must reside in the upper half (< height / 2)
      const a0 = calculateBranchY("A", 0, totalPerOption, height);
      const a5 = calculateBranchY("A", 5, totalPerOption, height);
      expect(a0).toBeLessThan(height / 2);
      expect(a5).toBeLessThan(height / 2);
      expect(a5).toBeGreaterThan(a0);

      // Option B branches (0 to 5) must reside in the lower half (> height / 2)
      const b0 = calculateBranchY("B", 0, totalPerOption, height);
      const b5 = calculateBranchY("B", 5, totalPerOption, height);
      expect(b0).toBeGreaterThan(height / 2);
      expect(b5).toBeGreaterThan(height / 2);
      expect(b5).toBeGreaterThan(b0);

      // Monotonic vertical separation
      expect(b0).toBeGreaterThan(a5);
    });

    it("resolves functional health status colors correctly", () => {
      expect(getStatusColor("thriving")).toBe(STATUS_COLORS.thriving);
      expect(getStatusColor("plateau")).toBe(STATUS_COLORS.plateau);
      expect(getStatusColor("struggling")).toBe(STATUS_COLORS.struggling);
      expect(getStatusColor("burnout")).toBe(STATUS_COLORS.burnout);
      expect(getStatusColor("unknown")).toBe(STATUS_COLORS.neutral);
    });
  });

  describe("MultiverseTreeCanvas Component", () => {
    it("renders canvas container and canvas element adhering to Anti-AI-Slop standards", () => {
      const html = renderToString(
        <MultiverseTreeCanvas
          branches={sampleBranches}
          scrubberMonth={12}
          selectedTimelineId="tl-a-bold"
          selectedQuarter={2}
        />
      );

      expect(html).toContain('data-testid="multiverse-tree-container"');
      expect(html).toContain('data-testid="multiverse-tree-canvas"');
      expect(html).toContain("bg-[#09090b]");

      // Strict Anti-AI-Slop compliance assertion
      assertAntiSlopCompliance(html);
    });
  });
});
