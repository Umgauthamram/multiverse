/**
 * Scene Language Specification & Parser/Formatter
 * A closed, line-based language where one line = one fact.
 * Feeds both the Live Ticker and the Canvas Theater animation.
 */

export type SceneScopeKind = "global" | "story" | "quarter";

export interface SceneScope {
  kind: SceneScopeKind;
  raw: string;
  storyId?: string;
  quarter?: number;
}

import { inspectForCrisis } from "@/lib/safety/crisisInterceptor";

export type SceneVerb =
  | "BOOT"
  | "FORK"
  | "CAST"
  | "ROLL"
  | "CALC"
  | "THINK"
  | "DELTA"
  | "CLAMP"
  | "STATUS"
  | "SAY"
  | "DONE"
  | "END"
  | "PROGRESS"
  | "REROUTE"
  | "ERROR"
  | "NARRATE"
  | "FINISH";

export interface VerbDefinition {
  scopeKind: SceneScopeKind;
  allowedKeys: readonly string[];
  requiredKeys: readonly string[];
  tickerTemplate: string | null;
}

export const VERBS: Record<SceneVerb, VerbDefinition> = {
  BOOT: {
    scopeKind: "global",
    allowedKeys: ["sess", "stories", "quarters"],
    requiredKeys: ["sess", "stories", "quarters"],
    tickerTemplate: "Session ready: {stories} lives x {quarters} quarters",
  },
  FORK: {
    scopeKind: "story",
    allowedKeys: ["opt", "seed", "label", "loc"],
    requiredKeys: ["opt", "seed", "label", "loc"],
    tickerTemplate: "{storyId} forked: {label}",
  },
  CAST: {
    scopeKind: "global",
    allowedKeys: ["role", "name", "trait"],
    requiredKeys: ["role", "name", "trait"],
    tickerTemplate: "Cast loaded: {name} ({role}, {trait})",
  },
  ROLL: {
    scopeKind: "quarter",
    allowedKeys: ["ev", "sev", "title"],
    requiredKeys: ["ev", "sev", "title"],
    tickerTemplate: "{storyId} Q{q} event: {title} ({sev})",
  },
  CALC: {
    scopeKind: "quarter",
    allowedKeys: ["cash0", "inc", "exp", "evc", "cash1"],
    requiredKeys: ["cash0", "inc", "exp", "evc", "cash1"],
    tickerTemplate: "{storyId} Q{q} {cash0} + ({inc} - {exp}) x 3 + {evc} = {cash1}",
  },
  THINK: {
    scopeKind: "quarter",
    allowedKeys: ["prov"],
    requiredKeys: ["prov"],
    tickerTemplate: "{storyId} Q{q} life agent drafting via {prov}",
  },
  DELTA: {
    scopeKind: "quarter",
    allowedKeys: ["joy", "hp", "rel", "car"],
    requiredKeys: ["joy", "hp", "rel", "car"],
    tickerTemplate: "{storyId} Q{q} delta joy {joy} / health {hp} / rel {rel} / career {car}",
  },
  CLAMP: {
    scopeKind: "quarter",
    allowedKeys: ["joy", "hp", "rel", "car", "hit"],
    requiredKeys: ["joy", "hp", "rel", "car", "hit"],
    tickerTemplate: "{storyId} Q{q} clamped to joy {joy} / health {hp} / rel {rel} / career {car}",
  },
  STATUS: {
    scopeKind: "quarter",
    allowedKeys: ["st", "burn"],
    requiredKeys: ["st", "burn"],
    tickerTemplate: "{storyId} Q{q} status: {st}",
  },
  SAY: {
    scopeKind: "quarter",
    allowedKeys: ["who", "text"],
    requiredKeys: ["who", "text"],
    tickerTemplate: "{storyId} Q{q} diary: {text}",
  },
  DONE: {
    scopeKind: "quarter",
    allowedKeys: [],
    requiredKeys: [],
    tickerTemplate: null,
  },
  END: {
    scopeKind: "story",
    allowedKeys: ["cash", "st"],
    requiredKeys: ["cash", "st"],
    tickerTemplate: "{storyId} finished: cash {cash}, {st}",
  },
  PROGRESS: {
    scopeKind: "global",
    allowedKeys: ["done", "total"],
    requiredKeys: ["done", "total"],
    tickerTemplate: null,
  },
  REROUTE: {
    scopeKind: "global",
    allowedKeys: ["from", "to"],
    requiredKeys: ["from", "to"],
    tickerTemplate: "Provider {from} busy, rerouting to {to}",
  },
  ERROR: {
    scopeKind: "quarter",
    allowedKeys: ["code"],
    requiredKeys: ["code"],
    tickerTemplate: "{storyId} Q{q} failed: {code}, retrying",
  },
  NARRATE: {
    scopeKind: "global",
    allowedKeys: ["phase"],
    requiredKeys: ["phase"],
    tickerTemplate: "Finale: {phase}",
  },
  FINISH: {
    scopeKind: "global",
    allowedKeys: [],
    requiredKeys: [],
    tickerTemplate: "All lives complete",
  },
};

export type SceneArgValue = string | number;

export interface ParsedSceneLine<V extends SceneVerb = SceneVerb> {
  verb: V;
  scope: SceneScope;
  args: Record<string, SceneArgValue>;
}

export const MAX_LINE_LENGTH = 280;
export const MAX_ARG_VALUE_LENGTH = 220;

/**
 * Sanitizes input strings:
 * - Replaces non-ASCII characters with safe ASCII equivalents or removes them.
 * - Strips control characters (\x00-\x1F, \x7F) and newlines (\r, \n).
 * - Caps max length to 220 characters.
 */
export function sanitizeText(input: string, maxLen: number = MAX_ARG_VALUE_LENGTH): string {
  if (!input) return "";

  // Replace common unicode quotes / dashes with ASCII
  let cleaned = input
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2026]/g, "...");

  // Strip control characters and newlines
  cleaned = cleaned.replace(/[\r\n\t\x00-\x1F\x7F]/g, " ");

  // Strip non-ASCII characters
  cleaned = cleaned.replace(/[^\x20-\x7E]/g, "");

  // Collapse consecutive spaces
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  if (cleaned.length > maxLen) {
    cleaned = cleaned.slice(0, maxLen);
  }

  return cleaned;
}

/**
 * Builds a SceneScope object from raw string or components.
 */
export function createScope(scopeStr: string): SceneScope | null {
  const trimmed = scopeStr.trim();
  if (trimmed === "@*") {
    return { kind: "global", raw: "@*" };
  }

  // Quarter-level: e.g. @S2/Q7
  const quarterMatch = trimmed.match(/^@([A-Za-z0-9_]+)\/Q(\d+)$/);
  if (quarterMatch) {
    return {
      kind: "quarter",
      raw: trimmed,
      storyId: quarterMatch[1],
      quarter: parseInt(quarterMatch[2], 10),
    };
  }

  // Story-level: e.g. @S1
  const storyMatch = trimmed.match(/^@([A-Za-z0-9_]+)$/);
  if (storyMatch) {
    return {
      kind: "story",
      raw: trimmed,
      storyId: storyMatch[1],
    };
  }

  return null;
}

/**
 * Parses a raw Scene Language string into a structured ParsedSceneLine.
 * Returns null and logs a dev warning if the line has an unknown verb, unknown key, or invalid syntax.
 */
export function parseLine(line: string): ParsedSceneLine | null {
  if (!line || typeof line !== "string") {
    return null;
  }

  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  // Split scope, verb, and the rest
  const parts = trimmed.split(/\s+/);
  if (parts.length < 2) {
    console.warn(`[SceneLanguage] Line missing verb: "${trimmed}"`);
    return null;
  }

  const scopeStr = parts[0];
  const verbStr = parts[1] as SceneVerb;

  const scope = createScope(scopeStr);
  if (!scope) {
    console.warn(`[SceneLanguage] Invalid scope: "${scopeStr}"`);
    return null;
  }

  const verbDef = VERBS[verbStr];
  if (!verbDef) {
    console.warn(`[SceneLanguage] Unknown verb dropped: "${verbStr}"`);
    return null;
  }

  if (scope.kind !== verbDef.scopeKind) {
    console.warn(
      `[SceneLanguage] Scope mismatch for verb ${verbStr}: expected ${verbDef.scopeKind}, got ${scope.kind}`
    );
    return null;
  }

  // Parse args
  const rawArgs = trimmed.slice(scopeStr.length + 1 + verbStr.length).trim();
  const args: Record<string, SceneArgValue> = {};

  if (rawArgs.length > 0) {
    let cursor = 0;
    while (cursor < rawArgs.length) {
      // Skip whitespace
      while (cursor < rawArgs.length && /\s/.test(rawArgs[cursor])) {
        cursor++;
      }
      if (cursor >= rawArgs.length) break;

      // Read key: [a-z][a-z0-9_]*
      const keyStart = cursor;
      while (cursor < rawArgs.length && /[a-zA-Z0-9_]/.test(rawArgs[cursor])) {
        cursor++;
      }
      const key = rawArgs.slice(keyStart, cursor);

      if (cursor >= rawArgs.length || rawArgs[cursor] !== "=") {
        console.warn(`[SceneLanguage] Malformed key/value pair near cursor ${cursor}: "${rawArgs}"`);
        return null;
      }
      cursor++; // Skip '='

      if (!verbDef.allowedKeys.includes(key)) {
        console.warn(`[SceneLanguage] Unknown key "${key}" dropped for verb ${verbStr}`);
        return null;
      }

      // Read value: quoted string, integer, or ident
      let value: SceneArgValue = "";
      if (rawArgs[cursor] === '"') {
        cursor++; // skip opening quote
        let valChars = "";
        let escaped = false;
        while (cursor < rawArgs.length) {
          const char = rawArgs[cursor];
          if (escaped) {
            valChars += char;
            escaped = false;
          } else if (char === "\\") {
            escaped = true;
          } else if (char === '"') {
            cursor++; // skip closing quote
            break;
          } else {
            valChars += char;
          }
          cursor++;
        }
        value = valChars;
      } else {
        // Read unquoted token
        const valStart = cursor;
        while (cursor < rawArgs.length && !/\s/.test(rawArgs[cursor])) {
          cursor++;
        }
        const token = rawArgs.slice(valStart, cursor);

        // Check if integer (supports explicit + or -)
        if (/^[+-]?\d+$/.test(token)) {
          value = parseInt(token, 10);
        } else {
          value = token;
        }
      }

      args[key] = value;
    }
  }

  // Verify all required keys are present
  for (const requiredKey of verbDef.requiredKeys) {
    if (args[requiredKey] === undefined) {
      console.warn(`[SceneLanguage] Missing required key "${requiredKey}" for verb ${verbStr}`);
      return null;
    }
  }

  return {
    verb: verbStr,
    scope,
    args,
  };
}

/**
 * Formats a ParsedSceneLine into a standardized Scene Language string.
 * Guarantees output is ASCII-only and <= 280 characters.
 */
export function formatLine(line: ParsedSceneLine): string {
  const { verb, scope, args } = line;
  const verbDef = VERBS[verb];
  if (!verbDef) {
    throw new Error(`[SceneLanguage] Unknown verb cannot be formatted: ${verb}`);
  }

  const scopeStr = scope.raw;
  const argParts: string[] = [];

  for (const key of verbDef.allowedKeys) {
    if (args[key] !== undefined) {
      const val = args[key];
      if (typeof val === "number") {
        if (verb === "DELTA") {
          // Explicit +/- for DELTA numbers
          argParts.push(`${key}=${val >= 0 ? `+${val}` : val}`);
        } else {
          argParts.push(`${key}=${val}`);
        }
      } else {
        // String value: sanitize and quote if needed
        const sanitized = sanitizeText(String(val), MAX_ARG_VALUE_LENGTH);
        const needsQuotes =
          sanitized.includes(" ") ||
          sanitized.includes('"') ||
          sanitized.includes("=") ||
          sanitized.length === 0 ||
          key === "text" ||
          key === "title" ||
          key === "label" ||
          key === "loc" ||
          key === "name";

        if (needsQuotes) {
          const escaped = sanitized.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
          argParts.push(`${key}="${escaped}"`);
        } else {
          argParts.push(`${key}=${sanitized}`);
        }
      }
    }
  }

  let formatted = `${scopeStr} ${verb}`;
  if (argParts.length > 0) {
    formatted += ` ${argParts.join(" ")}`;
  }

  // Ensure line length constraint <= 280
  if (formatted.length > MAX_LINE_LENGTH) {
    // If oversized, truncate the last quoted arg (typically 'text' or 'label')
    const lastArgIndex = argParts.length - 1;
    if (lastArgIndex >= 0) {
      const excess = formatted.length - MAX_LINE_LENGTH;
      const lastKey = verbDef.allowedKeys[lastArgIndex];
      const rawVal = String(args[lastKey] || "");
      const allowedLen = Math.max(10, rawVal.length - excess - 4);
      const truncated = sanitizeText(rawVal, allowedLen);
      argParts[lastArgIndex] = `${lastKey}="${truncated.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
      formatted = `${scopeStr} ${verb} ${argParts.join(" ")}`;
    }
  }

  return formatted;
}

/**
 * Validates whether a line string is valid syntax and vocabulary.
 */
export function validateLine(line: string): boolean {
  return parseLine(line) !== null;
}

/**
 * Renders user-facing ticker text from a parsed line based on closed vocabulary templates.
 * Returns null if the verb is silent/internal (e.g. DONE, PROGRESS).
 */
export function renderTickerText(line: ParsedSceneLine): string | null {
  if (line.verb === "SAY") {
    const raw = String(line.args.text || "");
    if (inspectForCrisis(raw).isCrisis) {
      return null;
    }
  }

  const verbDef = VERBS[line.verb];
  if (!verbDef || !verbDef.tickerTemplate) {
    return null;
  }

  let text = verbDef.tickerTemplate;

  // Replace scope variables
  text = text.replace(/{storyId}/g, line.scope.storyId || "");
  text = text.replace(/{q}/g, line.scope.quarter !== undefined ? String(line.scope.quarter) : "");

  // Replace arg variables
  for (const [key, val] of Object.entries(line.args)) {
    text = text.replace(new RegExp(`{${key}}`, "g"), String(val));
  }

  return text;
}
