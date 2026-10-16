/**
 * Safety Guardrails & Crisis Interceptor
 *
 * Deterministic, zero-token interceptor scanning incoming user decision dilemmas
 * for indications of self-harm, severe psychological distress, acute medical emergencies,
 * or unlawful harm. Immediately halts simulation and presents verified crisis helplines.
 */

export type CrisisCategory =
  | "self_harm"
  | "severe_crisis"
  | "acute_medical"
  | "unlawful_harm";

export interface CrisisHelpline {
  name: string;
  region: string;
  contact: string;
  directActionUrl?: string; // tel: or https:
  availability: string;
  description: string;
}

export interface CrisisDetectionResult {
  isCrisis: boolean;
  category?: CrisisCategory;
  matchedPattern?: string;
  message: string;
  helplines: CrisisHelpline[];
}

/**
 * Verified Crisis Helplines across key regions (US, Canada, UK, India, and International).
 */
export const VERIFIED_HELPLINES: readonly CrisisHelpline[] = Object.freeze([
  {
    name: "988 Suicide & Crisis Lifeline",
    region: "United States & Canada",
    contact: "988",
    directActionUrl: "tel:988",
    availability: "24/7, Free & Confidential",
    description: "Immediate support for anyone experiencing distress, substance use crisis, or suicidal thoughts.",
  },
  {
    name: "Crisis Text Line",
    region: "United States, Canada & UK",
    contact: "Text HOME to 741741 (US/CA) or 85258 (UK)",
    directActionUrl: "sms:741741",
    availability: "24/7, Free & Confidential",
    description: "Free, confidential text-based crisis intervention.",
  },
  {
    name: "Samaritans",
    region: "United Kingdom & Ireland",
    contact: "116 123",
    directActionUrl: "tel:116123",
    availability: "24/7, Free",
    description: "Non-judgmental emotional support for anyone in distress or struggling to cope.",
  },
  {
    name: "Tele-MANAS",
    region: "India",
    contact: "14416 or 1800-891-4416",
    directActionUrl: "tel:14416",
    availability: "24/7, Free & Multi-lingual",
    description: "National Tele Mental Health Programme of India providing immediate psychological first-aid.",
  },
  {
    name: "Vandrevala Foundation Helpline",
    region: "India",
    contact: "+91 9999 666 555",
    directActionUrl: "tel:+919999666555",
    availability: "24/7, Free",
    description: "Leading professional mental health and suicide prevention counseling in India.",
  },
  {
    name: "Befrienders Worldwide & Find A Helpline",
    region: "International",
    contact: "findahelpline.com",
    directActionUrl: "https://findahelpline.com",
    availability: "24/7, Worldwide Directory",
    description: "Free, confidential support services in over 130 countries worldwide.",
  },
]);

/**
 * High-precision regex patterns for detecting genuine crisis intent.
 * Uses word boundaries and contextual structures to prevent false positives.
 */
const CRISIS_PATTERNS: Array<{
  category: CrisisCategory;
  pattern: RegExp;
  label: string;
}> = [
  // 1. Self-Harm & Suicide
  {
    category: "self_harm",
    pattern: /\b(?:suicid(?:e|al)|kill(?:ing)?\s+myself|end(?:ing)?\s+my\s+life|ending\s+it\s+all|want\s+to\s+die|hang(?:ing)?\s+myself|slit(?:ting)?\s+my\s+wrists?|tak(?:e|ing)\s+my\s+own\s+life|overdos(?:e|ing)\s+on\s+pills)\b/i,
    label: "Self-Harm / Suicidal Ideation",
  },
  {
    category: "self_harm",
    pattern: /\b(?:better\s+off\s+dead|no\s+reason\s+to\s+live|don'?t\s+want\s+to\s+live\s+anymore|wish\s+i\s+were\s+dead)\b/i,
    label: "Despair & Desire to Cease Living",
  },
  // 2. Severe Clinical Despair
  {
    category: "severe_crisis",
    pattern: /\b(?:severe\s+clinical\s+depression|extreme\s+hopelessness|completely\s+hopeless\s+despair|cannot\s+go\s+on\s+living)\b/i,
    label: "Severe Crisis / Hopelessness",
  },
  // 3. Acute Medical Emergencies
  {
    category: "acute_medical",
    pattern: /\b(?:severe\s+chest\s+pain|suspected\s+stroke|coughing\s+up\s+blood|acute\s+poisoning|anaphylactic\s+shock|having\s+a\s+heart\s+attack)\b/i,
    label: "Acute Medical Emergency",
  },
  // 4. Unlawful Violence / Harm to Others
  {
    category: "unlawful_harm",
    pattern: /\b(?:kill\s+(?:someone|them|others|people)|mass\s+shooting|plan\s+to\s+murder|bomb\s+(?:threat|making))\b/i,
    label: "Imminent Unlawful Harm",
  },
];

/**
 * Idiomatic phrases that use "kill", "dead", "die", or "hopeless" metaphorically in everyday English.
 * If any of these benign patterns match the trigger phrase, we suppress the crisis flag.
 */
const BENIGN_METAPHORICAL_PATTERNS: RegExp[] = [
  /\bkilling\s+it\s+at\s+work\b/i,
  /\bkiller\s+(?:resume|offer|feature|app|product|deal|presentation)\b/i,
  /\bdeadlines?\s+(?:are\s+)?killing\s+me\b/i,
  /\bdie-?hard\s+fan\b/i,
  /\bhopeless\s+romantic\b/i,
  /\bto\s+die\s+for\b/i,
  /\boverdose\s+of\s+(?:caffeine|sugar|coffee)\b/i,
  /\bhanging\s+out\b/i,
  /\bdying\s+to\s+(?:know|see|learn|join)\b/i,
];

/**
 * Scans an input string (e.g. decisionPrompt, option description) for crisis indicators.
 *
 * @param text The input text to inspect
 * @returns A CrisisDetectionResult indicating whether crisis intervention is required.
 */
export function inspectForCrisis(text: string): CrisisDetectionResult {
  if (!text || typeof text !== "string") {
    return {
      isCrisis: false,
      message: "No text provided",
      helplines: [],
    };
  }

  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return {
      isCrisis: false,
      message: "Empty input",
      helplines: [],
    };
  }

  // Check for benign metaphorical usages first
  for (const benignRegex of BENIGN_METAPHORICAL_PATTERNS) {
    if (benignRegex.test(trimmed)) {
      // If the entire dangerous substring was purely part of a common idiom, we check if there are other genuine crisis cues
      // For instance, "I'm killing it at work, but should I switch jobs?" -> safe
      const sanitized = trimmed.replace(benignRegex, "");
      // Re-test the sanitized remainder
      return inspectForCrisisWithoutMetaphors(sanitized);
    }
  }

  return inspectForCrisisWithoutMetaphors(trimmed);
}

function inspectForCrisisWithoutMetaphors(text: string): CrisisDetectionResult {
  for (const { category, pattern, label } of CRISIS_PATTERNS) {
    if (pattern.test(text)) {
      return {
        isCrisis: true,
        category,
        matchedPattern: label,
        message:
          "It looks like you or someone you know might be experiencing a crisis or distress. Multiverse You is a decision reflection tool and cannot provide emergency or medical care. Immediate confidential human support is available 24/7.",
        helplines: [...VERIFIED_HELPLINES],
      };
    }
  }

  return {
    isCrisis: false,
    message: "Input passed safety guardrails.",
    helplines: [],
  };
}

/**
 * Evaluates an entire intake payload across dilemma prompts and branch options
 * for crisis safety guardrails.
 */
export function evaluateIntakeSafety(intake: {
  decisionPrompt?: string;
  optionA?: { name?: string; description?: string };
  optionB?: { name?: string; description?: string };
}): CrisisDetectionResult {
  const fields = [
    intake.decisionPrompt,
    intake.optionA?.name,
    intake.optionA?.description,
    intake.optionB?.name,
    intake.optionB?.description,
  ];

  for (const field of fields) {
    if (field) {
      const res = inspectForCrisis(field);
      if (res.isCrisis) {
        return res;
      }
    }
  }

  return {
    isCrisis: false,
    message: "Input passed safety guardrails.",
    helplines: [],
  };
}

