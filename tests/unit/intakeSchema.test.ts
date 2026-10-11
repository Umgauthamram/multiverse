import { describe, it, expect } from "vitest";
import {
  IntakeSchema,
  DEFAULT_INTAKE_VALUES,
  validateIntakeInput,
} from "@/lib/schemas/intake";

describe("Phase 12: Decision Intake Form & Zod Schema Definition", () => {
  describe("Valid Inputs", () => {
    it("accepts canonical calibrated default intake values", () => {
      const result = IntakeSchema.safeParse(DEFAULT_INTAKE_VALUES);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.age).toBe(26);
        expect(result.data.currentLocation).toBe("Bengaluru, India");
        expect(result.data.optionA.name).toBe("London AI Startup");
        expect(result.data.optionB.name).toBe("Delhi Corporate Lead");
      }
    });

    it("accepts valid boundary conditions (age 18, 100, zero savings)", () => {
      const edgeCaseInput = {
        ...DEFAULT_INTAKE_VALUES,
        age: 18,
        liquidSavings: 0,
        monthlyBurn: 500,
        corePriorities: ["peace"],
      };

      const result = IntakeSchema.safeParse(edgeCaseInput);
      expect(result.success).toBe(true);

      const upperAge = {
        ...DEFAULT_INTAKE_VALUES,
        age: 100,
      };
      expect(IntakeSchema.safeParse(upperAge).success).toBe(true);
    });

    it("coerces string numbers into valid numeric values cleanly", () => {
      const stringCoerced = {
        ...DEFAULT_INTAKE_VALUES,
        age: "28",
        liquidSavings: "35000",
        monthlyBurn: "2200",
      };

      const result = IntakeSchema.safeParse(stringCoerced);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.age).toBe(28);
        expect(result.data.liquidSavings).toBe(35000);
        expect(result.data.monthlyBurn).toBe(2200);
      }
    });
  });

  describe("Validation Rejections & Invariants", () => {
    it("rejects age under 18 or above 100", () => {
      const under18 = { ...DEFAULT_INTAKE_VALUES, age: 17 };
      const over100 = { ...DEFAULT_INTAKE_VALUES, age: 101 };
      const negativeAge = { ...DEFAULT_INTAKE_VALUES, age: -5 };

      expect(IntakeSchema.safeParse(under18).success).toBe(false);
      expect(IntakeSchema.safeParse(over100).success).toBe(false);
      expect(IntakeSchema.safeParse(negativeAge).success).toBe(false);
    });

    it("rejects non-integer ages", () => {
      const floatAge = { ...DEFAULT_INTAKE_VALUES, age: 25.5 };
      expect(IntakeSchema.safeParse(floatAge).success).toBe(false);
    });

    it("rejects negative liquid savings", () => {
      const negSavings = { ...DEFAULT_INTAKE_VALUES, liquidSavings: -100 };
      expect(IntakeSchema.safeParse(negSavings).success).toBe(false);
    });

    it("rejects zero or negative monthly burn", () => {
      const zeroBurn = { ...DEFAULT_INTAKE_VALUES, monthlyBurn: 0 };
      const negBurn = { ...DEFAULT_INTAKE_VALUES, monthlyBurn: -500 };

      expect(IntakeSchema.safeParse(zeroBurn).success).toBe(false);
      expect(IntakeSchema.safeParse(negBurn).success).toBe(false);
    });

    it("rejects empty core priorities list", () => {
      const emptyPriorities = { ...DEFAULT_INTAKE_VALUES, corePriorities: [] };
      expect(IntakeSchema.safeParse(emptyPriorities).success).toBe(false);
    });

    it("rejects decision prompts shorter than 10 characters", () => {
      const shortPrompt = { ...DEFAULT_INTAKE_VALUES, decisionPrompt: "Quit job?" };
      expect(IntakeSchema.safeParse(shortPrompt).success).toBe(false);
    });

    it("rejects blank or incomplete Option A and Option B branches", () => {
      const blankOptionA = {
        ...DEFAULT_INTAKE_VALUES,
        optionA: {
          name: "",
          location: "London",
          description: "Full description is valid",
        },
      };
      expect(IntakeSchema.safeParse(blankOptionA).success).toBe(false);

      const shortDescOptionB = {
        ...DEFAULT_INTAKE_VALUES,
        optionB: {
          name: "Startup",
          location: "NYC",
          description: "Too short", // < 10 chars
        },
      };
      expect(IntakeSchema.safeParse(shortDescOptionB).success).toBe(false);
    });
  });

  describe("validateIntakeInput Helper Diagnostics", () => {
    it("returns keyed field errors for incomplete input submissions", () => {
      const partialInput = {
        age: 15, // invalid
        currentLocation: "", // invalid
        liquidSavings: -500, // invalid
        monthlyBurn: 0, // invalid
        corePriorities: [], // invalid
        decisionPrompt: "hi", // invalid
        optionA: { name: "", location: "", description: "" },
        optionB: { name: "", location: "", description: "" },
      };

      const result = validateIntakeInput(partialInput);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();

      if (result.errors) {
        expect(result.errors["age"]).toBeDefined();
        expect(result.errors["liquidSavings"]).toBeDefined();
        expect(result.errors["monthlyBurn"]).toBeDefined();
        expect(result.errors["corePriorities"]).toBeDefined();
        expect(result.errors["decisionPrompt"]).toBeDefined();
        expect(result.errors["optionA.name"]).toBeDefined();
      }
    });

    it("returns formatted data on successful validation", () => {
      const result = validateIntakeInput(DEFAULT_INTAKE_VALUES);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.errors).toBeUndefined();
    });
  });
});
