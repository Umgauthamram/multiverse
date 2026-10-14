import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  resolveBranchColor,
  resolveEventSeverityStyle,
  calculateHealthTrajectory,
  BRANCH_COLOR_MAP,
} from "@/lib/simulation/branchColorEngine";
import { BranchNodePopup } from "@/components/tree/BranchNodePopup";
import { assertAntiSlopCompliance } from "@/lib/design/antiSlopGuard";
import { LifeEvent } from "@/lib/simulation/eventRoller";

describe("Phase 23: Dynamic Branch Color States & Event Popups", () => {
  describe("resolveBranchColor Logic", () => {
    it("assigns Emerald (Thriving) for high happiness and health combinations", () => {
      const thrivingStats = {
        happiness: 78,
        health: 72,
        relationships: 65,
        career: 80,
      };
      const result = resolveBranchColor(thrivingStats);
      expect(result.status).toBe("thriving");
      expect(result.hexColor).toBe(BRANCH_COLOR_MAP.thriving.hexColor);
      expect(result.textClass).toBe("text-emerald-400");
    });

    it("assigns Amber (Plateau) for steady, non-critical mid-range combinations", () => {
      const plateauStats = {
        happiness: 58,
        health: 60,
        relationships: 55,
        career: 58,
      };
      const result = resolveBranchColor(plateauStats);
      expect(result.status).toBe("plateau");
      expect(result.hexColor).toBe(BRANCH_COLOR_MAP.plateau.hexColor);
      expect(result.textClass).toBe("text-amber-400");
    });

    it("assigns Crimson (Struggling) when happiness or health drops below 35", () => {
      const strugglingStats = {
        happiness: 30,
        health: 55,
        relationships: 40,
        career: 50,
      };
      const result = resolveBranchColor(strugglingStats);
      expect(result.status).toBe("struggling");
      expect(result.hexColor).toBe(BRANCH_COLOR_MAP.struggling.hexColor);
      expect(result.textClass).toBe("text-rose-400");
    });

    it("assigns Muted Slate (Burnout) when health drops into crisis or override is flagged", () => {
      const burnoutStats = {
        happiness: 12,
        health: 14,
        relationships: 20,
        career: 30,
      };
      const result = resolveBranchColor(burnoutStats);
      expect(result.status).toBe("burnout");
      expect(result.hexColor).toBe(BRANCH_COLOR_MAP.burnout.hexColor);
      expect(result.textClass).toBe("text-zinc-400");

      const overrideResult = resolveBranchColor({ happiness: 80, health: 80, relationships: 80, career: 80 }, true);
      expect(overrideResult.status).toBe("burnout");
    });
  });

  describe("resolveEventSeverityStyle", () => {
    it("maps event severities to functional Anti-AI-Slop badges", () => {
      expect(resolveEventSeverityStyle("positive").badgeLabel).toBe("OPPORTUNITY");
      expect(resolveEventSeverityStyle("positive").textClass).toBe("text-emerald-400");

      expect(resolveEventSeverityStyle("negative").badgeLabel).toBe("CRISIS / SHOCK");
      expect(resolveEventSeverityStyle("negative").textClass).toBe("text-rose-400");

      expect(resolveEventSeverityStyle("neutral").badgeLabel).toBe("STEADY STATE");
      expect(resolveEventSeverityStyle("neutral").textClass).toBe("text-zinc-400");
    });
  });

  describe("calculateHealthTrajectory", () => {
    it("accurately detects improving, declining, and stable momentum", () => {
      const improvingHistory = [
        { happiness: 50, health: 50, relationships: 50, career: 50 },
        { happiness: 56, health: 55, relationships: 54, career: 55 },
      ];
      expect(calculateHealthTrajectory(improvingHistory).trend).toBe("improving");

      const decliningHistory = [
        { happiness: 65, health: 65, relationships: 65, career: 65 },
        { happiness: 58, health: 58, relationships: 56, career: 60 },
      ];
      expect(calculateHealthTrajectory(decliningHistory).trend).toBe("declining");

      const stableHistory = [
        { happiness: 60, health: 60, relationships: 60, career: 60 },
        { happiness: 61, health: 60, relationships: 59, career: 60 },
      ];
      expect(calculateHealthTrajectory(stableHistory).trend).toBe("stable");
    });
  });

  describe("BranchNodePopup Component", () => {
    const sampleEvent: LifeEvent = {
      type: "promotion",
      title: "Senior Engineering Lead",
      description: "Leadership acknowledged core architecture milestones.",
      severity: "positive",
      statDeltas: {
        deltaHappiness: 6,
        deltaHealth: -2,
        deltaRelationships: 0,
        deltaCareer: 12,
      },
      financialImpact: {
        incomeMultiplier: 1.2,
        lumpSumExpense: 0,
        lumpSumWindfall: 4000,
      },
    };

    it("renders modal details including events, finances, stats, and authentic diary", () => {
      const html = renderToString(
        <BranchNodePopup
          timelineId="tl-1"
          branchName="London AI Startup"
          branchOption="A"
          personaSeed="bold"
          quarter={4}
          month={12}
          stats={{ happiness: 75, health: 68, relationships: 62, career: 85 }}
          statDeltas={{ deltaHappiness: 6, deltaHealth: -2, deltaRelationships: 0, deltaCareer: 12 }}
          endingSavings={38500}
          netWorthDelta={5200}
          event={sampleEvent}
          diaryEntry="Late night commit finalized before investor demo."
          reflection="Significant career leverage unlocked."
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      const cleanHtml = html.replace(/<!--.*?-->/g, "");
      expect(cleanHtml).toContain("Quarter 4 • Month 12");
      expect(cleanHtml).toContain("Path A: London AI Startup");
      expect(cleanHtml).toContain("OPPORTUNITY");
      expect(cleanHtml).toContain("Senior Engineering Lead");
      expect(cleanHtml).toContain("$38,500");
      expect(cleanHtml).toContain("+$5,200");
      expect(cleanHtml).toContain("Late night commit finalized");
      expect(cleanHtml).toContain("Significant career leverage");

      assertAntiSlopCompliance(html);
    });

    it("returns null when isOpen is false", () => {
      const html = renderToString(
        <BranchNodePopup
          timelineId="tl-1"
          branchName="London AI Startup"
          branchOption="A"
          personaSeed="bold"
          quarter={4}
          month={12}
          stats={{ happiness: 75, health: 68, relationships: 62, career: 85 }}
          event={sampleEvent}
          isOpen={false}
          onClose={vi.fn()}
        />
      );

      expect(html).toBe("");
    });
  });
});
