import { z } from "zod";

export const CorePriorityEnum = z.enum(["wealth", "peace", "relationships", "career"]);
export type CorePriority = z.infer<typeof CorePriorityEnum>;

export const DecisionBranchSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Branch name must be at least 2 characters")
    .max(80, "Branch name must not exceed 80 characters"),
  location: z
    .string()
    .trim()
    .min(2, "Branch location must be at least 2 characters")
    .max(80, "Branch location must not exceed 80 characters"),
  description: z
    .string()
    .trim()
    .min(10, "Branch description must be at least 10 characters")
    .max(500, "Branch description must not exceed 500 characters"),
});

export type DecisionBranch = z.infer<typeof DecisionBranchSchema>;

export const IntakeSchema = z.object({
  // Question 1: Demographics & Financial Snapshot
  age: z
    .coerce
    .number()
    .int("Age must be an integer")
    .min(18, "Age must be at least 18")
    .max(100, "Age must be at most 100"),
  currentLocation: z
    .string()
    .trim()
    .min(2, "Current location must be at least 2 characters")
    .max(80, "Current location must not exceed 80 characters"),
  liquidSavings: z
    .coerce
    .number()
    .min(0, "Liquid savings cannot be negative")
    .max(100_000_000, "Liquid savings exceeds maximum supported amount"),
  monthlyBurn: z
    .coerce
    .number()
    .positive("Monthly burn must be greater than 0")
    .max(1_000_000, "Monthly burn exceeds maximum realistic limit"),

  // Question 2: Psychological Priorities
  corePriorities: z
    .array(CorePriorityEnum)
    .min(1, "Please select at least one core priority")
    .max(4, "You may select up to 4 priorities"),

  // Question 3: The Dilemma Prompt
  decisionPrompt: z
    .string()
    .trim()
    .min(10, "Decision prompt must be at least 10 characters")
    .max(600, "Decision prompt must not exceed 600 characters"),

  // Question 4: Path A
  optionA: DecisionBranchSchema,

  // Question 5: Path B
  optionB: DecisionBranchSchema,
});

export type IntakeFormValues = z.infer<typeof IntakeSchema>;

/**
 * Calibrated default intake values representing a classic life crossroad
 * (London AI Startup vs Delhi Corporate Lead) as specified in PROJECT_PLAN.md.
 */
export const DEFAULT_INTAKE_VALUES: Readonly<IntakeFormValues> = Object.freeze({
  age: 26,
  currentLocation: "Bengaluru, India",
  liquidSavings: 25000,
  monthlyBurn: 1800,
  corePriorities: ["career", "wealth"] as CorePriority[],
  decisionPrompt:
    "Should I accept an early-stage founding engineer offer in London, or stay in my stable corporate tech lead role in Delhi?",
  optionA: {
    name: "London AI Startup",
    location: "London, UK",
    description:
      "Join high-risk seed AI startup as founding engineer with equity upside, higher visa risk, and international lifestyle.",
  },
  optionB: {
    name: "Delhi Corporate Lead",
    location: "Delhi, India",
    description:
      "Stay in stable Tier-1 tech company with predictable promotions, close family network, and high local savings rate.",
  },
});

export interface ValidationResult {
  success: boolean;
  data?: IntakeFormValues;
  errors?: Record<string, string>;
}

/**
 * Validates untyped intake form inputs and produces clean, field-keyed error diagnostics.
 */
export function validateIntakeInput(raw: unknown): ValidationResult {
  const result = IntakeSchema.safeParse(raw);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "form";
    if (!errors[key]) {
      errors[key] = issue.message;
    }
  }

  return { success: false, errors };
}
