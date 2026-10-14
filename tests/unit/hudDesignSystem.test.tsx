import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { BranchStatusBadge } from "@/components/hud/BranchStatusBadge";
import { HudMetricCard } from "@/components/hud/HudMetricCard";
import { HudHeader } from "@/components/hud/HudHeader";
import { HudContainer } from "@/components/hud/HudContainer";
import {
  validateSlopCompliance,
  assertAntiSlopCompliance,
  MANDATORY_FRAMING_NOTICE,
} from "@/lib/design/antiSlopGuard";

describe("Phase 21: Anti-AI-Slop Design System & Dark HUD Foundation", () => {
  describe("AntiSlopGuard Validator", () => {
    it("approves clean, compliant text and markup", () => {
      const cleanMarkup = `<div class="bg-[#09090b] text-zinc-100 border-zinc-800 font-tabular">
        <span>${MANDATORY_FRAMING_NOTICE}</span>
      </div>`;
      const result = validateSlopCompliance(cleanMarkup);
      expect(result.compliant).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(() => assertAntiSlopCompliance(cleanMarkup)).not.toThrow();
    });

    it("rejects marketing slop and pseudo-psychic forecasting phrases", () => {
      const badMarketing = "Our magical AI will predict your future with a crystal ball!";
      const result = validateSlopCompliance(badMarketing);
      expect(result.compliant).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(() => assertAntiSlopCompliance(badMarketing)).toThrow(
        /Forbidden marketing slop term/
      );
    });

    it("rejects forbidden purple/pink gradients and sparkle iconography", () => {
      const badStyles = '<button class="bg-gradient-to-r from-purple-500 to-pink-500 sparkle-icon">Click</button>';
      const result = validateSlopCompliance(badStyles);
      expect(result.compliant).toBe(false);
      expect(result.violations.some((v) => v.includes("Forbidden design cliché"))).toBe(true);
      expect(() => assertAntiSlopCompliance(badStyles)).toThrow(
        /Forbidden design cliché pattern/
      );
    });
  });

  describe("BranchStatusBadge Component", () => {
    it("renders thriving status with emerald styling", () => {
      const html = renderToString(<BranchStatusBadge status="thriving" />);
      expect(html).toContain("THRIVING");
      expect(html).toContain("text-emerald-400");
      expect(html).toContain("bg-emerald-500/10");
      assertAntiSlopCompliance(html);
    });

    it("renders plateau status with amber styling", () => {
      const html = renderToString(<BranchStatusBadge status="plateau" />);
      expect(html).toContain("PLATEAU");
      expect(html).toContain("text-amber-400");
      assertAntiSlopCompliance(html);
    });

    it("renders struggling/crisis status with rose/crimson styling", () => {
      const html = renderToString(<BranchStatusBadge status="struggling" />);
      expect(html).toContain("STRUGGLING");
      expect(html).toContain("text-rose-400");
      assertAntiSlopCompliance(html);
    });

    it("renders burnout status with muted slate styling", () => {
      const html = renderToString(<BranchStatusBadge status="burnout" />);
      expect(html).toContain("BURNOUT");
      expect(html).toContain("text-zinc-400");
      assertAntiSlopCompliance(html);
    });
  });

  describe("HudMetricCard Component", () => {
    it("renders tabular value with positive delta indicator", () => {
      const html = renderToString(
        <HudMetricCard
          label="Net Worth"
          value="$48,500"
          delta={3200}
          deltaSuffix="/mo"
          unit="USD"
          status="thriving"
          caption="Compounding at 5% p.a."
        />
      );

      const cleanHtml = html.replace(/<!--.*?-->/g, "");
      expect(cleanHtml).toContain("Net Worth");
      expect(cleanHtml).toContain("uppercase");
      expect(cleanHtml).toContain("$48,500");
      expect(cleanHtml).toContain("font-tabular");
      expect(cleanHtml).toContain("+3200/mo");
      expect(cleanHtml).toContain("▲");
      expect(cleanHtml).toContain("text-emerald-400");
      assertAntiSlopCompliance(html);
    });

    it("renders negative delta with crimson indicator", () => {
      const html = renderToString(
        <HudMetricCard
          label="Health Index"
          value="42"
          delta={-8}
          status="struggling"
        />
      );

      const cleanHtml = html.replace(/<!--.*?-->/g, "");
      expect(cleanHtml).toContain("Health Index");
      expect(cleanHtml).toContain("uppercase");
      expect(cleanHtml).toContain("42");
      expect(cleanHtml).toContain("-8");
      expect(cleanHtml).toContain("▼");
      expect(cleanHtml).toContain("text-rose-400");
      assertAntiSlopCompliance(html);
    });
  });

  describe("HudHeader Component", () => {
    it("renders mandatory framing notice and dilemma summary without slop", () => {
      const html = renderToString(
        <HudHeader
          optionAName="London AI Startup"
          optionBName="Delhi Corporate Lead"
          status="running"
          currentMonth={12}
        />
      );

      const cleanHtml = html.replace(/<!--.*?-->/g, "");
      expect(cleanHtml).toContain("Multiverse You");
      expect(cleanHtml).toContain("uppercase");
      expect(cleanHtml).toContain("Reflective Simulation Engine • Not a Future Prediction");
      expect(cleanHtml).toContain("London AI Startup vs Delhi Corporate Lead");
      expect(cleanHtml).toContain("SIMULATING (MONTH 12/60)");
      assertAntiSlopCompliance(html);
    });
  });

  describe("HudContainer Component", () => {
    it("renders layout slots and manages drawer translation classes", () => {
      const closedHtml = renderToString(
        <HudContainer
          headerSlot={<div>Header</div>}
          metricsSlot={<div>Metrics Dock</div>}
          controlsSlot={<div>Scrubber</div>}
          drawerSlot={<div>Drawer Content</div>}
          isDrawerOpen={false}
        >
          <div>Canvas Visualizer</div>
        </HudContainer>
      );

      expect(closedHtml).toContain("Header");
      expect(closedHtml).toContain("Metrics Dock");
      expect(closedHtml).toContain("Canvas Visualizer");
      expect(closedHtml).toContain("Scrubber");
      expect(closedHtml).toContain("translate-x-full");
      assertAntiSlopCompliance(closedHtml);

      const openHtml = renderToString(
        <HudContainer
          drawerSlot={<div>Drawer Content</div>}
          isDrawerOpen={true}
        />
      );

      expect(openHtml).toContain("translate-x-0");
      assertAntiSlopCompliance(openHtml);
    });
  });
});
