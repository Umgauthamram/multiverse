import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  BranchDetailDrawer,
  formatCurrency,
  generateSparklinePath,
  StatSparkline,
  TimelineDetailData,
} from "@/components/tree/BranchDetailDrawer";
import { TimelineStepDocument } from "@/lib/db/models/Simulation";
import { assertAntiSlopCompliance } from "@/lib/design/antiSlopGuard";

describe("Phase 25: Branch Deep-Dive Diary Drawer", () => {
  describe("Mathematical & Format Utilities", () => {
    it("formats standard, zero, negative, and invalid currency values reliably", () => {
      expect(formatCurrency(0)).toBe("$0");
      expect(formatCurrency(3500)).toBe("$3,500");
      expect(formatCurrency(125000)).toBe("$125,000");
      expect(formatCurrency(-4200)).toBe("-$4,200");
      expect(formatCurrency(NaN)).toBe("$0");
      expect(formatCurrency(Infinity)).toBe("$0");
    });

    it("generates valid SVG coordinate paths for mini sparklines", () => {
      const emptyResult = generateSparklinePath([], 100, 20);
      expect(emptyResult.linePath).toContain("M 0");
      expect(emptyResult.areaPath).toContain("Z");

      const values = [50, 60, 40, 75, 80];
      const result = generateSparklinePath(values, 120, 32, 0, 100);
      expect(result.linePath).toMatch(/^M \d+(\.\d+)? \d+(\.\d+)? L/);
      expect(result.areaPath).toContain("Z");
      expect(result.startPoint.x).toBe(0);
      expect(result.endPoint.x).toBe(120);
    });
  });

  describe("StatSparkline Component", () => {
    it("renders label, formatted values, delta badge, and SVG path", () => {
      const html = renderToString(
        <StatSparkline
          label="Happiness"
          values={[55, 60, 68, 74]}
          strokeColor="#10b981"
          fillColor="rgba(16, 185, 129, 0.1)"
          currentValue={74}
          delta={6}
        />
      );

      const cleanHtml = html.replace(/<!--.*?-->/g, "");
      expect(cleanHtml).toContain("Happiness");
      expect(cleanHtml).toContain("74");
      expect(cleanHtml).toContain("+6");
      expect(cleanHtml).toContain("<svg");
      expect(cleanHtml).toContain("<path");

      assertAntiSlopCompliance(html);
    });

    it("renders currency sparklines with appropriate negative delta styling", () => {
      const html = renderToString(
        <StatSparkline
          label="Liquid Net Worth Progression"
          values={[25000, 28000, 26500]}
          strokeColor="#34d399"
          fillColor="rgba(52, 211, 153, 0.05)"
          currentValue={26500}
          delta={-1500}
          isCurrency={true}
        />
      );

      const cleanHtml = html.replace(/<!--.*?-->/g, "");
      expect(cleanHtml).toContain("Liquid Net Worth Progression");
      expect(cleanHtml).toContain("$26,500");
      expect(cleanHtml).toContain("-$1,500");
      expect(cleanHtml).toContain("text-rose-400");
    });
  });

  describe("BranchDetailDrawer Component", () => {
    const mockTimeline: TimelineDetailData = {
      timelineId: "tl-mock-1",
      branchOption: "A",
      branchName: "London AI Startup",
      branchLocation: "London, UK",
      personaSeed: "bold",
      personaArchetype: "High-Risk Pioneer",
      totalQuartersCompleted: 4,
      finalStats: {
        happiness: 72,
        health: 65,
        relationships: 58,
        career: 84,
      },
      finalSavings: 42000,
      isBurnedOut: false,
    };

    const mockSteps: TimelineStepDocument[] = [
      {
        sessionId: "sess-1",
        timelineId: "tl-mock-1",
        branchOption: "A",
        branchName: "London AI Startup",
        branchLocation: "London, UK",
        personaSeed: "bold",
        quarter: 1,
        month: 3,
        startingSavings: 20000,
        endingSavings: 24000,
        netWorthDelta: 4000,
        monthlyIncome: 8000,
        monthlyBurn: 6666,
        stats: { happiness: 65, health: 70, relationships: 60, career: 68 },
        statDeltas: { deltaHappiness: 5, deltaHealth: 0, deltaRelationships: -2, deltaCareer: 8 },
        rolledEvent: {
          type: "promotion",
          title: "Angel Funding Secured",
          description: "Closed $1.5M pre-seed round from European syndicates.",
          severity: "positive",
          statDeltas: { deltaHappiness: 8, deltaHealth: -3, deltaRelationships: 0, deltaCareer: 15 },
          financialImpact: { incomeMultiplier: 1.1, lumpSumExpense: 0, lumpSumWindfall: 5000 },
        },
        diaryEntry: "Signed the term sheet at a cafe in Shoreditch. Adrenaline running high.",
        reflection: "Taking the leap opened doors that staying corporate never could.",
        isBurnedOut: false,
        status: "active",
        recordedAt: new Date("2026-01-01"),
      },
      {
        sessionId: "sess-1",
        timelineId: "tl-mock-1",
        branchOption: "A",
        branchName: "London AI Startup",
        branchLocation: "London, UK",
        personaSeed: "bold",
        quarter: 2,
        month: 6,
        startingSavings: 24000,
        endingSavings: 29500,
        netWorthDelta: 5500,
        monthlyIncome: 8500,
        monthlyBurn: 6666,
        stats: { happiness: 72, health: 65, relationships: 58, career: 84 },
        statDeltas: { deltaHappiness: 7, deltaHealth: -5, deltaRelationships: -2, deltaCareer: 16 },
        rolledEvent: {
          type: "steady",
          title: "MVP Launch Crunch",
          description: "Late nights shipping the core platform engine.",
          severity: "neutral",
          statDeltas: { deltaHappiness: 2, deltaHealth: -6, deltaRelationships: -4, deltaCareer: 10 },
          financialImpact: { incomeMultiplier: 1.0, lumpSumExpense: 500, lumpSumWindfall: 0 },
        },
        diaryEntry: "Shipped v1 to 50 beta customers. Exhausted but the feedback is validating.",
        reflection: "Pivotal divergence: health strain is accumulating as velocity peaks.",
        isBurnedOut: false,
        status: "active",
        recordedAt: new Date("2026-04-01"),
      },
    ];

    it("returns null when isOpen is false or timeline is null", () => {
      const closedHtml = renderToString(
        <BranchDetailDrawer
          isOpen={false}
          onClose={vi.fn()}
          timeline={mockTimeline}
          steps={mockSteps}
        />
      );
      expect(closedHtml).toBe("");

      const nullTimelineHtml = renderToString(
        <BranchDetailDrawer
          isOpen={true}
          onClose={vi.fn()}
          timeline={null}
          steps={mockSteps}
        />
      );
      expect(nullTimelineHtml).toBe("");
    });

    it("renders slide-out drawer with profile, sparklines, diary records, and anti-slop banner", () => {
      const onClose = vi.fn();
      const onSelectQuarter = vi.fn();

      const html = renderToString(
        <BranchDetailDrawer
          isOpen={true}
          onClose={onClose}
          timeline={mockTimeline}
          steps={mockSteps}
          activeQuarter={2}
          onSelectQuarter={onSelectQuarter}
        />
      );

      const cleanHtml = html.replace(/<!--.*?-->/g, "");

      // Dialog accessibility
      expect(cleanHtml).toContain('role="dialog"');
      expect(cleanHtml).toContain('aria-modal="true"');
      expect(cleanHtml).toContain('aria-labelledby="drawer-branch-title"');

      // Character & branch profile
      expect(cleanHtml).toContain("Path A");
      expect(cleanHtml).toContain("High-Risk Pioneer Seed");
      expect(cleanHtml).toContain("London AI Startup");
      expect(cleanHtml).toContain("London, UK • 5-Year Counterfactual Trajectory");

      // Mandatory anti-AI-slop disclaimer
      expect(cleanHtml).toContain("Reflective Simulation Engine");
      expect(cleanHtml).toContain("Not a Future Prediction");

      // Sparklines overview
      expect(cleanHtml).toContain("5-Year Trajectory Overview");
      expect(cleanHtml).toContain("2 of 20 Quarters Logged");
      expect(cleanHtml).toContain("Happiness");
      expect(cleanHtml).toContain("Health");
      expect(cleanHtml).toContain("Social");
      expect(cleanHtml).toContain("Career");
      expect(cleanHtml).toContain("Liquid Net Worth Progression");

      // Quarter selector tabs
      expect(cleanHtml).toContain("Q1");
      expect(cleanHtml).toContain("Q2");
      expect(cleanHtml).toContain("Q20");

      // Selected Quarter 2 narrative & diary
      expect(cleanHtml).toContain("Quarter 2 • Month 6 (Year 0 +6mo)");
      expect(cleanHtml).toContain("MVP Launch Crunch");
      expect(cleanHtml).toContain("Shipped v1 to 50 beta customers");
      expect(cleanHtml).toContain("Pivotal divergence: health strain is accumulating");

      // Financial balance ledger
      expect(cleanHtml).toContain("Zero-Token Financial Balance Ledger");
      expect(cleanHtml).toContain("$8,500"); // monthly income
      expect(cleanHtml).toContain("$6,666"); // monthly burn
      expect(cleanHtml).toContain("+$5,500"); // net delta
      expect(cleanHtml).toContain("$29,500"); // ending savings

      // Anti-AI-slop compliance
      assertAntiSlopCompliance(html);
    });

    it("displays empty state when selected quarter has no step recorded", () => {
      const html = renderToString(
        <BranchDetailDrawer
          isOpen={true}
          onClose={vi.fn()}
          timeline={mockTimeline}
          steps={mockSteps}
          activeQuarter={15}
        />
      );

      const cleanHtml = html.replace(/<!--.*?-->/g, "");
      expect(cleanHtml).toContain("No simulation step recorded for Quarter 15.");
    });
  });
});
