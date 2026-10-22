import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  FinaleReportView,
  getHeatmapCellColor,
  getRegretCategoryStyle,
  FinaleTimelineInput,
  FinaleStepInput,
} from "@/components/finale/FinaleReportView";
import { FinaleReport } from "@/lib/ai/agents/narratorAgent";
import { assertAntiSlopCompliance } from "@/lib/design/antiSlopGuard";

describe("Phase 28: Finale Screen & Regret Heatmap Visualization", () => {
  describe("Heatmap Color & Style Utilities", () => {
    it("returns correct styling for burnout, crisis, mild strain, and flourishing", () => {
      // Undefined cell
      expect(getHeatmapCellColor(undefined).text).toBe("text-zinc-400");

      // Burnout
      const burnoutCell = {
        month: 18,
        quarter: 6,
        timelineId: "tl-2",
        path: "A" as const,
        personaSeed: "cautious",
        happiness: 25,
        happinessDelta: -15,
        isBurnedOut: true,
      };
      expect(getHeatmapCellColor(burnoutCell).border).toContain("rose-900");

      // Crisis / low happiness
      const crisisCell = {
        ...burnoutCell,
        isBurnedOut: false,
        happiness: 35,
        happinessDelta: -8,
      };
      expect(getHeatmapCellColor(crisisCell).bg).toContain("rose-950");

      // Mild strain
      const mildStrainCell = {
        ...burnoutCell,
        isBurnedOut: false,
        happiness: 52,
        happinessDelta: -2,
      };
      expect(getHeatmapCellColor(mildStrainCell).bg).toContain("amber-950");

      // Flourishing (75+)
      const flourishingCell = {
        ...burnoutCell,
        isBurnedOut: false,
        happiness: 82,
        happinessDelta: 6,
      };
      expect(getHeatmapCellColor(flourishingCell).bg).toContain("emerald-950");
    });

    it("maps regret categories to calibrated functional tokens", () => {
      expect(getRegretCategoryStyle("health").label).toBe("HEALTH & VITALITY");
      expect(getRegretCategoryStyle("relationships").label).toBe("SOCIAL & ROOTS");
      expect(getRegretCategoryStyle("finances").label).toBe("FINANCIAL RESERVES");
      expect(getRegretCategoryStyle("career").label).toBe("CAREER RESTLESSNESS");
      expect(getRegretCategoryStyle("unknown").label).toBe("UNKNOWN");
    });
  });

  describe("FinaleReportView Component Rendering", () => {
    const mockReport: FinaleReport = {
      executiveReflection:
        "Path A generates unprecedented financial upside and technical autonomy, but exacts an early emotional toll. Path B provides enduring family proximity and psychological stability with steady compounding savings.",
      pathAOverallSummary:
        "Path A accelerates career momentum but concentrates systemic risk around month 18 burnout shocks.",
      pathBOverallSummary:
        "Path B preserves emotional resilience and personal bonds across all 5 evaluated years.",
      rankedFutures: [
        {
          rank: 1,
          timelineId: "tl-3",
          path: "A",
          personaSeed: "balanced",
          score: 89,
          headline: "Sustainable Startup Leadership",
          tradeoffSummary: "Disciplined personal boundaries offset high-pressure demands.",
        },
        {
          rank: 2,
          timelineId: "tl-9",
          path: "B",
          personaSeed: "balanced",
          score: 86,
          headline: "Compounding Stability & Regional Proximity",
          tradeoffSummary: "Modest initial salary growth compensated by rich relationship indices.",
        },
      ],
      pivotalDivergences: [
        {
          title: "Month 12: Venture Financing vs Corporate Promotion",
          month: 12,
          description: "Path A locks into a high-stakes equity runway while Path B receives a structured senior title.",
          counterfactualComparison: "London accelerates equity variance; Delhi secures reliable compounding.",
        },
        {
          title: "Month 24: Immigration Strain vs Deepened Social Roots",
          month: 24,
          description: "Path A encounters visa friction while Path B anchors in local homeownership.",
          counterfactualComparison: "Acute cognitive distress in London contrasted with steady social vitality.",
        },
      ],
      regretHotspots: [
        {
          category: "health",
          severity: "critical",
          affectedPaths: ["A"],
          insight: "Unregulated sprints during startup scaling precipitate severe Month 18 burnout.",
          mitigationAdvice: "Institute strict physical rest guardrails before executing equity agreements.",
        },
        {
          category: "relationships",
          severity: "medium",
          affectedPaths: ["A"],
          insight: "Extended physical distance strains childhood friendships and domestic family ties.",
          mitigationAdvice: "Pre-commit to quarterly return flights and regular asynchronous contact.",
        },
      ],
      synthesisDisclaimer: "Reflective Simulation Engine • Not a Future Prediction",
    };

    const mockTimelines: FinaleTimelineInput[] = [
      {
        timelineId: "tl-1",
        branchOption: "A",
        branchName: "London AI Startup",
        branchLocation: "London, UK",
        personaSeed: "bold",
        finalSavings: 180000,
      },
      {
        timelineId: "tl-2",
        branchOption: "B",
        branchName: "Delhi Corporate Lead",
        branchLocation: "Delhi, India",
        personaSeed: "balanced",
        finalSavings: 95000,
      },
    ];

    const mockSteps: FinaleStepInput[] = [
      {
        timelineId: "tl-1",
        quarter: 1,
        month: 3,
        stats: { happiness: 65, health: 70, relationships: 60, career: 68 },
        statDeltas: { deltaHappiness: 5 },
        isBurnedOut: false,
        endingSavings: 25000,
      },
      {
        timelineId: "tl-1",
        quarter: 2,
        month: 6,
        stats: { happiness: 78, health: 68, relationships: 58, career: 75 },
        statDeltas: { deltaHappiness: 13 },
        isBurnedOut: false,
        endingSavings: 35000,
      },
      {
        timelineId: "tl-2",
        quarter: 1,
        month: 3,
        stats: { happiness: 70, health: 75, relationships: 80, career: 62 },
        statDeltas: { deltaHappiness: 2 },
        isBurnedOut: false,
        endingSavings: 22000,
      },
    ];

    it("renders complete finale view with executive reflection, heatmap, ranked futures, and divergences", () => {
      const onRestart = vi.fn();
      const onExploreTree = vi.fn();

      const html = renderToString(
        <FinaleReportView
          report={mockReport}
          decisionPrompt="Should I join the London AI startup or accept the Delhi corporate lead role?"
          optionA={{ name: "London AI Startup", location: "London, UK" }}
          optionB={{ name: "Delhi Corporate Lead", location: "Delhi, India" }}
          timelines={mockTimelines}
          steps={mockSteps}
          onRestart={onRestart}
          onExploreTree={onExploreTree}
        />
      );

      const cleanHtml = html.replace(/<!--.*?-->/g, "");

      // Mandatory anti-AI-slop disclaimer
      expect(cleanHtml).toContain("Reflective Simulation Engine • Not a Future Prediction");

      // Executive reflection
      expect(cleanHtml).toContain("5-Year Counterfactual Synthesis");
      expect(cleanHtml).toContain("Path A generates unprecedented financial upside");
      expect(cleanHtml).toContain("Path A: London AI Startup");
      expect(cleanHtml).toContain("Path B: Delhi Corporate Lead");

      // Heatmap matrix
      expect(cleanHtml).toContain("Interactive Regret Heatmap Matrix");
      expect(cleanHtml).toContain("Q1");
      expect(cleanHtml).toContain("Q20");
      expect(cleanHtml).toContain("T1");
      expect(cleanHtml).toContain("T2");

      // Ranked futures cards
      expect(cleanHtml).toContain("Ranked Futures Matrix");
      expect(cleanHtml).toContain("#1");
      expect(cleanHtml).toContain("Sustainable Startup Leadership");
      expect(cleanHtml).toContain("Score: 89/100");
      expect(cleanHtml).toContain("Disciplined personal boundaries offset high-pressure demands.");

      // Pivotal divergences
      expect(cleanHtml).toContain("The Critical Divergence Moments");
      expect(cleanHtml).toContain("Month 12: Venture Financing vs Corporate Promotion");
      expect(cleanHtml).toContain("Month 24: Immigration Strain vs Deepened Social Roots");

      // Regret hotspots
      expect(cleanHtml).toContain("Systemic Regret Hotspots");
      expect(cleanHtml).toContain("HEALTH");
      expect(cleanHtml).toContain("VITALITY");
      expect(cleanHtml).toContain("Unregulated sprints during startup scaling precipitate severe Month 18 burnout.");
      expect(cleanHtml).toContain("Institute strict physical rest guardrails before executing equity agreements.");

      // Navigation buttons
      expect(cleanHtml).toContain("Return to Tree Canvas");
      expect(cleanHtml).toContain("New Simulation");

      // Anti-AI-slop compliance verification
      assertAntiSlopCompliance(html);
    });

    it("renders finale report with 4 canonical timelines (T1 to T4) seamlessly", () => {
      const canonical4Timelines: FinaleTimelineInput[] = [
        {
          timelineId: "S1",
          branchOption: "A",
          branchName: "London AI Startup",
          branchLocation: "London, UK",
          personaSeed: "bold",
          finalSavings: 150000,
        },
        {
          timelineId: "S2",
          branchOption: "A",
          branchName: "London AI Startup",
          branchLocation: "London, UK",
          personaSeed: "anxious",
          finalSavings: 90000,
        },
        {
          timelineId: "S3",
          branchOption: "B",
          branchName: "Delhi Corporate Lead",
          branchLocation: "Delhi, India",
          personaSeed: "balanced",
          finalSavings: 110000,
        },
        {
          timelineId: "S4",
          branchOption: "B",
          branchName: "Delhi Corporate Lead",
          branchLocation: "Delhi, India",
          personaSeed: "workaholic",
          finalSavings: 140000,
        },
      ];

      const html = renderToString(
        <FinaleReportView
          report={mockReport}
          decisionPrompt="Should I join the London startup or stay in Delhi?"
          optionA={{ name: "London AI Startup", location: "London, UK" }}
          optionB={{ name: "Delhi Corporate Lead", location: "Delhi, India" }}
          timelines={canonical4Timelines}
          steps={mockSteps}
          onRestart={() => {}}
          onExploreTree={() => {}}
        />
      );

      const cleanHtml = html.replace(/<!--.*?-->/g, "");

      expect(cleanHtml).toContain("5-Year Counterfactual Synthesis");
      expect(cleanHtml).toContain("Interactive Regret Heatmap Matrix");
      expect(cleanHtml).toContain("T1");
      expect(cleanHtml).toContain("T4");
      assertAntiSlopCompliance(html);
    });
  });
});
