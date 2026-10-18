import { describe, it, expect, vi } from "vitest";
import {
  parseLine,
  formatLine,
  validateLine,
  renderTickerText,
  sanitizeText,
  VERBS,
  ParsedSceneLine,
  MAX_LINE_LENGTH,
  MAX_ARG_VALUE_LENGTH,
} from "@/lib/scene/sceneLanguage";

describe("Phase 1: Scene Language Parser & Formatter", () => {
  it("round-trips format -> parse for every single verb in the closed vocabulary", () => {
    const sampleLines: ParsedSceneLine[] = [
      {
        verb: "BOOT",
        scope: { kind: "global", raw: "@*" },
        args: { sess: "sim_test_123", stories: 4, quarters: 20 },
      },
      {
        verb: "FORK",
        scope: { kind: "story", raw: "@S1", storyId: "S1" },
        args: { opt: "A", seed: "bold", label: "London / Bold", loc: "London, UK" },
      },
      {
        verb: "CAST",
        scope: { kind: "global", raw: "@*" },
        args: { role: "partner", name: "Priya", trait: "anxious" },
      },
      {
        verb: "ROLL",
        scope: { kind: "quarter", raw: "@S2/Q7", storyId: "S2", quarter: 7 },
        args: { ev: "promotion", sev: "pos", title: "Promotion granted" },
      },
      {
        verb: "CALC",
        scope: { kind: "quarter", raw: "@S2/Q7", storyId: "S2", quarter: 7 },
        args: { cash0: 24500, inc: 5000, exp: 2500, evc: 0, cash1: 32000 },
      },
      {
        verb: "THINK",
        scope: { kind: "quarter", raw: "@S2/Q7", storyId: "S2", quarter: 7 },
        args: { prov: "groq" },
      },
      {
        verb: "DELTA",
        scope: { kind: "quarter", raw: "@S2/Q7", storyId: "S2", quarter: 7 },
        args: { joy: -8, hp: -5, rel: -12, car: 15 },
      },
      {
        verb: "CLAMP",
        scope: { kind: "quarter", raw: "@S2/Q7", storyId: "S2", quarter: 7 },
        args: { joy: 62, hp: 65, rel: 48, car: 85, hit: "none" },
      },
      {
        verb: "STATUS",
        scope: { kind: "quarter", raw: "@S2/Q7", storyId: "S2", quarter: 7 },
        args: { st: "thriving", burn: 0 },
      },
      {
        verb: "SAY",
        scope: { kind: "quarter", raw: "@S2/Q7", storyId: "S2", quarter: 7 },
        args: { who: "you", text: "Got the Senior title and equity." },
      },
      {
        verb: "DONE",
        scope: { kind: "quarter", raw: "@S2/Q7", storyId: "S2", quarter: 7 },
        args: {},
      },
      {
        verb: "END",
        scope: { kind: "story", raw: "@S1", storyId: "S1" },
        args: { cash: 45000, st: "thriving" },
      },
      {
        verb: "PROGRESS",
        scope: { kind: "global", raw: "@*" },
        args: { done: 47, total: 80 },
      },
      {
        verb: "REROUTE",
        scope: { kind: "global", raw: "@*" },
        args: { from: "groq", to: "nvidia" },
      },
      {
        verb: "ERROR",
        scope: { kind: "quarter", raw: "@S2/Q7", storyId: "S2", quarter: 7 },
        args: { code: "timeout" },
      },
      {
        verb: "NARRATE",
        scope: { kind: "global", raw: "@*" },
        args: { phase: "digest" },
      },
      {
        verb: "FINISH",
        scope: { kind: "global", raw: "@*" },
        args: {},
      },
    ];

    expect(sampleLines.length).toBe(Object.keys(VERBS).length);

    for (const sample of sampleLines) {
      const formatted = formatLine(sample);
      expect(typeof formatted).toBe("string");
      expect(validateLine(formatted)).toBe(true);

      const parsed = parseLine(formatted);
      expect(parsed).not.toBeNull();
      expect(parsed?.verb).toBe(sample.verb);
      expect(parsed?.scope.raw).toBe(sample.scope.raw);
      expect(parsed?.args).toEqual(sample.args);
    }
  });

  it("drops unknown verbs and keys without throwing an error", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Unknown verb
    const unknownVerbLine = "@* EXPLODE force=100";
    expect(parseLine(unknownVerbLine)).toBeNull();

    // Unknown key for valid verb
    const unknownKeyLine = "@* BOOT sess=123 stories=4 quarters=20 hacker=true";
    expect(parseLine(unknownKeyLine)).toBeNull();

    // Scope mismatch
    const scopeMismatchLine = "@S1 BOOT sess=123 stories=4 quarters=20";
    expect(parseLine(scopeMismatchLine)).toBeNull();

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("handles quotes, escaped quotes (\\\"), and limits string args to 220 characters", () => {
    const textWithQuotes = 'He said: "Ship to production now!" and smiled.';
    const sayLine: ParsedSceneLine<"SAY"> = {
      verb: "SAY",
      scope: { kind: "quarter", raw: "@S1/Q1", storyId: "S1", quarter: 1 },
      args: { who: "you", text: textWithQuotes },
    };

    const formatted = formatLine(sayLine);
    expect(formatted).toContain('\\"Ship to production now!\\"');

    const parsed = parseLine(formatted);
    expect(parsed?.args.text).toBe(textWithQuotes);

    // Over 220 chars
    const overlyLongText = "A".repeat(300);
    const sanitized = sanitizeText(overlyLongText);
    expect(sanitized.length).toBe(MAX_ARG_VALUE_LENGTH);
  });

  it("guarantees ASCII-only content and strips control characters and newlines", () => {
    const dirtyText = "Line 1\nLine 2\r\tWith Emoji 🚀 and Smart “Quotes” & Em—dash";
    const cleaned = sanitizeText(dirtyText);

    // No non-ASCII characters
    expect(/[^\x20-\x7E]/.test(cleaned)).toBe(false);
    expect(cleaned).not.toContain("\n");
    expect(cleaned).not.toContain("\r");
    expect(cleaned).toContain('"Quotes"');
    expect(cleaned).toContain("-dash");
  });

  it("strictly enforces maximum line length <= 280 characters", () => {
    const maxLine: ParsedSceneLine<"SAY"> = {
      verb: "SAY",
      scope: { kind: "quarter", raw: "@S4/Q20", storyId: "S4", quarter: 20 },
      args: {
        who: "you",
        text: "X".repeat(220),
      },
    };

    const formatted = formatLine(maxLine);
    expect(formatted.length).toBeLessThanOrEqual(MAX_LINE_LENGTH);
    expect(validateLine(formatted)).toBe(true);
  });

  it("renders correct ticker text templates for user-facing lines and returns null for silent lines", () => {
    const bootLine: ParsedSceneLine = {
      verb: "BOOT",
      scope: { kind: "global", raw: "@*" },
      args: { sess: "xyz", stories: 4, quarters: 20 },
    };
    expect(renderTickerText(bootLine)).toBe("Session ready: 4 lives x 20 quarters");

    const calcLine: ParsedSceneLine = {
      verb: "CALC",
      scope: { kind: "quarter", raw: "@S2/Q7", storyId: "S2", quarter: 7 },
      args: { cash0: 24500, inc: 5000, exp: 2500, evc: 0, cash1: 32000 },
    };
    expect(renderTickerText(calcLine)).toBe("S2 Q7 24500 + (5000 - 2500) x 3 + 0 = 32000");

    const rollLine: ParsedSceneLine = {
      verb: "ROLL",
      scope: { kind: "quarter", raw: "@S1/Q3", storyId: "S1", quarter: 3 },
      args: { ev: "promotion", sev: "pos", title: "Senior Lead Promotion" },
    };
    expect(renderTickerText(rollLine)).toBe("S1 Q3 event: Senior Lead Promotion (pos)");

    const doneLine: ParsedSceneLine = {
      verb: "DONE",
      scope: { kind: "quarter", raw: "@S1/Q3", storyId: "S1", quarter: 3 },
      args: {},
    };
    expect(renderTickerText(doneLine)).toBeNull();

    const progressLine: ParsedSceneLine = {
      verb: "PROGRESS",
      scope: { kind: "global", raw: "@*" },
      args: { done: 10, total: 80 },
    };
    expect(renderTickerText(progressLine)).toBeNull();

    const finishLine: ParsedSceneLine = {
      verb: "FINISH",
      scope: { kind: "global", raw: "@*" },
      args: {},
    };
    expect(renderTickerText(finishLine)).toBe("All lives complete");
  });
});
