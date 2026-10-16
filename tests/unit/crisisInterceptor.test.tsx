import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  inspectForCrisis,
  evaluateIntakeSafety,
  VERIFIED_HELPLINES,
} from "@/lib/safety/crisisInterceptor";
import { CrisisDialog } from "@/components/safety/CrisisDialog";
import { assertAntiSlopCompliance } from "@/lib/design/antiSlopGuard";

describe("Phase 29: Safety Guardrails & Crisis Interceptor", () => {
  describe("inspectForCrisis True Positive Detections", () => {
    it("intercepts explicit self-harm and suicidal ideation queries", () => {
      const phrases = [
        "I feel like I want to die and end my life.",
        "Should I move to London or commit suicide?",
        "If this startup fails, I am thinking of taking my own life.",
        "Everyone would be better off dead without me.",
        "I want to kill myself rather than face failure.",
        "Thinking about overdosing on pills tonight.",
        "I have no reason to live anymore.",
      ];

      for (const phrase of phrases) {
        const result = inspectForCrisis(phrase);
        expect(result.isCrisis).toBe(true);
        expect(result.category).toBe("self_harm");
        expect(result.helplines.length).toBeGreaterThanOrEqual(4);
        expect(result.message).toContain("Immediate confidential human support");
      }
    });

    it("intercepts severe clinical despair queries", () => {
      const phrases = [
        "I am trapped in severe clinical depression and cannot go on living.",
        "Living through completely hopeless despair with no way forward.",
      ];

      for (const phrase of phrases) {
        const result = inspectForCrisis(phrase);
        expect(result.isCrisis).toBe(true);
        expect(result.category).toBe("severe_crisis");
      }
    });

    it("intercepts acute medical emergency expressions", () => {
      const phrases = [
        "I am having severe chest pain right now, should I take the flight?",
        "Experiencing coughing up blood and suspected stroke.",
      ];

      for (const phrase of phrases) {
        const result = inspectForCrisis(phrase);
        expect(result.isCrisis).toBe(true);
        expect(result.category).toBe("acute_medical");
      }
    });

    it("intercepts unlawful harm and violent planning", () => {
      const phrases = [
        "I plan to murder my manager if they do not promote me.",
        "Planning to kill someone at my current office.",
      ];

      for (const phrase of phrases) {
        const result = inspectForCrisis(phrase);
        expect(result.isCrisis).toBe(true);
        expect(result.category).toBe("unlawful_harm");
      }
    });
  });

  describe("inspectForCrisis False Positive Immunity (Benign Metaphors)", () => {
    it("does NOT flag common colloquial and metaphorical expressions", () => {
      const benignPhrases = [
        "I am killing it at work lately, should I ask for a promotion?",
        "I received a killer offer from an AI startup in London.",
        "My current project has a killer resume impact.",
        "These quarterly deadlines are killing me, but I enjoy the challenge.",
        "I am a die-hard fan of distributed systems architecture.",
        "I am a hopeless romantic trying to decide between love and career.",
        "The salary package in London is to die for.",
        "I had an overdose of caffeine during yesterday's hackathon.",
        "I enjoy hanging out with my friends in Delhi.",
        "I am dying to see the new engineering office in London.",
        "Should I accept a senior engineering role in London or stay in Delhi?",
      ];

      for (const phrase of benignPhrases) {
        const result = inspectForCrisis(phrase);
        expect(result.isCrisis).toBe(false);
        expect(result.helplines).toHaveLength(0);
      }
    });

    it("handles empty, whitespace, and invalid inputs gracefully", () => {
      expect(inspectForCrisis("").isCrisis).toBe(false);
      expect(inspectForCrisis("   ").isCrisis).toBe(false);
      expect(inspectForCrisis(null as unknown as string).isCrisis).toBe(false);
      expect(inspectForCrisis(undefined as unknown as string).isCrisis).toBe(false);
    });
  });

  describe("Verified Helplines Registry", () => {
    it("contains comprehensive 24/7 resources across US, UK, India, and International", () => {
      expect(VERIFIED_HELPLINES.length).toBeGreaterThanOrEqual(5);

      const helplineNames = VERIFIED_HELPLINES.map((h) => h.name);
      expect(helplineNames).toContain("988 Suicide & Crisis Lifeline");
      expect(helplineNames).toContain("Crisis Text Line");
      expect(helplineNames).toContain("Samaritans");
      expect(helplineNames).toContain("Tele-MANAS");

      // Verify each helpline has valid contact info and 24/7 availability
      for (const helpline of VERIFIED_HELPLINES) {
        expect(helpline.contact.length).toBeGreaterThan(0);
        expect(helpline.region.length).toBeGreaterThan(0);
        expect(helpline.availability).toContain("24/7");
        expect(helpline.directActionUrl).toBeDefined();
      }
    });
  });

  describe("evaluateIntakeSafety Multi-Field Scanner", () => {
    it("intercepts crisis cues present in dilemma prompt or branch option descriptions", () => {
      const unsafeIntake = {
        decisionPrompt: "Should I quit my job or take my own life?",
        optionA: { name: "Quit job", description: "Resign and stay home" },
        optionB: { name: "Stay", description: "Stay at current company" },
      };

      const result = evaluateIntakeSafety(unsafeIntake);
      expect(result.isCrisis).toBe(true);
      expect(result.category).toBe("self_harm");

      const unsafeOptionIntake = {
        decisionPrompt: "Should I accept the relocation to Tokyo?",
        optionA: { name: "Tokyo", description: "Move to Tokyo for the new role" },
        optionB: { name: "Decline", description: "I want to kill myself if I stay in this city" },
      };

      const resultB = evaluateIntakeSafety(unsafeOptionIntake);
      expect(resultB.isCrisis).toBe(true);
      expect(resultB.category).toBe("self_harm");
    });

    it("passes safe intake payloads without triggering false positives", () => {
      const safeIntake = {
        decisionPrompt: "Should I accept the Seed round offer or bootstrap for 12 months?",
        optionA: { name: "Take Seed", description: "Accept $1.5M VC term sheet and scale team" },
        optionB: { name: "Bootstrap", description: "Rely on customer cashflow and remain independent" },
      };

      const result = evaluateIntakeSafety(safeIntake);
      expect(result.isCrisis).toBe(false);
      expect(result.helplines.length).toBe(0);
    });
  });

  describe("CrisisDialog Component", () => {
    it("returns null when isOpen is false", () => {
      const html = renderToString(
        <CrisisDialog isOpen={false} onClose={vi.fn()} />
      );
      expect(html).toBe("");
    });

    it("renders alertdialog modal with helplines and compassionate restrained styling", () => {
      const onClose = vi.fn();
      const html = renderToString(
        <CrisisDialog
          isOpen={true}
          onClose={onClose}
          category="self_harm"
          matchedPattern="Self-Harm / Suicidal Ideation"
        />
      );

      const cleanHtml = html.replace(/<!--.*?-->/g, "");

      // Accessibility roles
      expect(cleanHtml).toContain('role="alertdialog"');
      expect(cleanHtml).toContain('aria-modal="true"');
      expect(cleanHtml).toContain('aria-labelledby="crisis-dialog-title"');
      expect(cleanHtml).toContain('aria-describedby="crisis-dialog-desc"');

      // Crisis intervention headers
      expect(cleanHtml).toContain("Safety Support Intervention");
      expect(cleanHtml).toContain("Self-Harm / Suicidal Ideation");
      expect(cleanHtml).toContain("Immediate Support &amp; Safety Resources");

      // Verified helplines
      expect(cleanHtml).toContain("988 Suicide &amp; Crisis Lifeline");
      expect(cleanHtml).toContain("Samaritans");
      expect(cleanHtml).toContain("Tele-MANAS");
      expect(cleanHtml).toContain("tel:988");
      expect(cleanHtml).toContain("tel:116123");
      expect(cleanHtml).toContain("tel:14416");

      // Acknowledgment button
      expect(cleanHtml).toContain("I Acknowledge");

      // Anti-AI-slop compliance
      assertAntiSlopCompliance(html);
    });
  });
});
