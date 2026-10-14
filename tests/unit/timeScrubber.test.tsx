import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  clampMonth,
  monthToQuarter,
  formatMonthLabel,
  YEAR_MARKERS,
  TimeScrubber,
} from "@/components/tree/TimeScrubber";
import { assertAntiSlopCompliance } from "@/lib/design/antiSlopGuard";

describe("Phase 24: Interactive Time Scrubber (Months 0 to 60)", () => {
  describe("Mathematical Clamping & Conversion Utilities", () => {
    it("clamps months within [0, maxMonth] and handles anomalies", () => {
      expect(clampMonth(0)).toBe(0);
      expect(clampMonth(30)).toBe(30);
      expect(clampMonth(60)).toBe(60);
      expect(clampMonth(-10)).toBe(0);
      expect(clampMonth(120)).toBe(60);
      expect(clampMonth(45, 36)).toBe(36);
      expect(clampMonth(NaN)).toBe(0);
      expect(clampMonth(Infinity)).toBe(0);
      expect(clampMonth(14.7)).toBe(15);
    });

    it("accurately maps months 0..60 to quarterly indices 0..20", () => {
      expect(monthToQuarter(0)).toBe(0);
      expect(monthToQuarter(2)).toBe(0);
      expect(monthToQuarter(3)).toBe(1);
      expect(monthToQuarter(11)).toBe(3);
      expect(monthToQuarter(12)).toBe(4);
      expect(monthToQuarter(24)).toBe(8);
      expect(monthToQuarter(36)).toBe(12);
      expect(monthToQuarter(48)).toBe(16);
      expect(monthToQuarter(60)).toBe(20);
      expect(monthToQuarter(80)).toBe(20);
    });

    it("formats human-readable labels for exact years and interim months", () => {
      expect(formatMonthLabel(0)).toBe("Today (Month 0)");
      expect(formatMonthLabel(12)).toBe("Year 1 (Month 12 • Q4)");
      expect(formatMonthLabel(15)).toBe("Year 1 +3mo (Month 15 • Q5)");
      expect(formatMonthLabel(36)).toBe("Year 3 (Month 36 • Q12)");
      expect(formatMonthLabel(40)).toBe("Year 3 +4mo (Month 40 • Q14)");
      expect(formatMonthLabel(60)).toBe("Year 5 (Month 60 • Q20)");
    });

    it("has 6 uniform year milestone markers", () => {
      expect(YEAR_MARKERS).toHaveLength(6);
      expect(YEAR_MARKERS.map((m) => m.month)).toEqual([0, 12, 24, 36, 48, 60]);
      expect(YEAR_MARKERS.map((m) => m.label)).toEqual([
        "Today",
        "Yr 1",
        "Yr 2",
        "Yr 3",
        "Yr 4",
        "Yr 5",
      ]);
    });
  });

  describe("TimeScrubber Component Rendering", () => {
    it("renders slider with correct initial state, aria attributes, and time readout", () => {
      const onMonthChange = vi.fn();
      const html = renderToString(
        <TimeScrubber
          currentMonth={12}
          onMonthChange={onMonthChange}
          maxMonth={60}
        />
      );

      const cleanHtml = html.replace(/<!--.*?-->/g, "");
      expect(cleanHtml).toContain("Timeline Head");
      expect(cleanHtml).toContain("Year 1 (Month 12 • Q4)");
      expect(cleanHtml).toContain("(Q4 / 20)");
      expect(cleanHtml).toContain('aria-valuenow="12"');
      expect(cleanHtml).toContain('aria-valuemin="0"');
      expect(cleanHtml).toContain('aria-valuemax="60"');
      expect(cleanHtml).toContain("-3mo");
      expect(cleanHtml).toContain("+3mo");

      // Verify all year markers are rendered
      YEAR_MARKERS.forEach((m) => {
        expect(cleanHtml).toContain(m.label);
      });

      // Progress bar percentage for month 12 out of 60 is 20%
      expect(cleanHtml).toContain("width:20%");

      assertAntiSlopCompliance(html);
    });

    it("renders play toggle button when onTogglePlay is supplied", () => {
      const onTogglePlay = vi.fn();
      const pausedHtml = renderToString(
        <TimeScrubber
          currentMonth={0}
          onMonthChange={vi.fn()}
          isPlaying={false}
          onTogglePlay={onTogglePlay}
        />
      );
      expect(pausedHtml).toContain("▶ PLAY");
      expect(pausedHtml).toContain("border-emerald-500/30");

      const playingHtml = renderToString(
        <TimeScrubber
          currentMonth={0}
          onMonthChange={vi.fn()}
          isPlaying={true}
          onTogglePlay={onTogglePlay}
        />
      );
      expect(playingHtml).toContain("❚❚ PAUSE");
      expect(playingHtml).toContain("border-amber-500/30");
    });

    it("renders speed toggle indicator when onSpeedChange is supplied", () => {
      const onSpeedChange = vi.fn();
      const html = renderToString(
        <TimeScrubber
          currentMonth={24}
          onMonthChange={vi.fn()}
          playbackSpeed={2}
          onSpeedChange={onSpeedChange}
        />
      );
      expect(html).toContain("2x");
      expect(html).toContain('aria-label="Playback speed 2x"');
    });
  });
});
