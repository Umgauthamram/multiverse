/**
 * Anti-AI-Slop Design & Language Validator
 * Enforces strict adherence to the Anti-AI-Slop Manifesto:
 * - Rejects generic purple/cyan/rainbow gradients and sparkle iconography
 * - Rejects sensationalist pseudo-psychic language ("predict your future", "fortune teller")
 * - Enforces the mandatory framing invariant: "Reflective Simulation Tool • Not a Future Prediction"
 */

export const FORBIDDEN_SLOP_TERMS: readonly string[] = Object.freeze([
  "predict your future",
  "psychic forecast",
  "fortune teller",
  "crystal ball",
  "magic ai",
  "magical ai",
  "ai sorcery",
  "manifest your destiny",
  "future prediction",
]);

export const FORBIDDEN_STYLE_PATTERNS: readonly RegExp[] = Object.freeze([
  /from-purple/i,
  /to-pink/i,
  /from-fuchsia/i,
  /bg-gradient-to-r.*purple/i,
  /sparkle/i,
]);

export const MANDATORY_FRAMING_NOTICE =
  "Reflective Simulation Engine • Not a Future Prediction";

export interface SlopValidationResult {
  compliant: boolean;
  violations: string[];
}

/**
 * Validates text or markup strings against Anti-AI-Slop design guidelines.
 */
export function validateSlopCompliance(content: string): SlopValidationResult {
  const violations: string[] = [];
  const lower = content.toLowerCase();

  // 1. Check prohibited text terms (excluding the mandatory negation phrase "not a future prediction")
  const sanitized = lower.replace(/not a future prediction/gi, "");
  for (const term of FORBIDDEN_SLOP_TERMS) {
    if (sanitized.includes(term)) {
      violations.push(`Forbidden marketing slop term detected: "${term}"`);
    }
  }

  // 2. Check prohibited style patterns
  for (const pattern of FORBIDDEN_STYLE_PATTERNS) {
    if (pattern.test(content)) {
      violations.push(
        `Forbidden design cliché pattern detected matching: ${pattern.toString()}`
      );
    }
  }

  return {
    compliant: violations.length === 0,
    violations,
  };
}

/**
 * Throws an error if content contains any prohibited AI-slop tropes.
 */
export function assertAntiSlopCompliance(content: string): void {
  const result = validateSlopCompliance(content);
  if (!result.compliant) {
    throw new Error(
      `[AntiSlopGuard] Anti-AI-Slop compliance failure:\n - ${result.violations.join(
        "\n - "
      )}`
    );
  }
}
