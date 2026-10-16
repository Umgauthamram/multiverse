"use client";

import React, { useState } from "react";
import {
  IntakeFormValues,
  DEFAULT_INTAKE_VALUES,
  validateIntakeInput,
  CorePriority,
} from "@/lib/schemas/intake";
import { VoiceInput } from "./VoiceInput";
import { CrisisDialog } from "@/components/safety/CrisisDialog";
import {
  evaluateIntakeSafety,
  CrisisDetectionResult,
} from "@/lib/safety/crisisInterceptor";

interface IntakeFormProps {
  initialValues?: Partial<IntakeFormValues>;
  onSubmitSuccess?: (values: IntakeFormValues) => void;
  onCancel?: () => void;
}

const PRIORITY_OPTIONS: { id: CorePriority; label: string; desc: string }[] = [
  {
    id: "career",
    label: "Career & Ambition",
    desc: "Rapid skill growth, leadership scope, and professional impact.",
  },
  {
    id: "wealth",
    label: "Financial Independence",
    desc: "Maximizing savings runway, equity upside, and compounding net worth.",
  },
  {
    id: "peace",
    label: "Peace & Mental Health",
    desc: "Predictable rhythm, burnout mitigation, and emotional stability.",
  },
  {
    id: "relationships",
    label: "Relationships & Community",
    desc: "Proximity to family, deep friendships, and emotional belonging.",
  },
];

export function IntakeForm({
  initialValues,
  onSubmitSuccess,
  onCancel,
}: IntakeFormProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [formData, setFormData] = useState<IntakeFormValues>({
    ...DEFAULT_INTAKE_VALUES,
    ...initialValues,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [crisisResult, setCrisisResult] = useState<CrisisDetectionResult | null>(null);

  // Field change helpers
  const updateField = <K extends keyof IntakeFormValues>(
    field: K,
    value: IntakeFormValues[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field-specific error
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const updateBranchField = (
    branch: "optionA" | "optionB",
    field: "name" | "location" | "description",
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [branch]: {
        ...prev[branch],
        [field]: value,
      },
    }));
    const errorKey = `${branch}.${field}`;
    if (errors[errorKey]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[errorKey];
        return next;
      });
    }
  };

  const togglePriority = (priority: CorePriority) => {
    const current = formData.corePriorities;
    const exists = current.includes(priority);
    let updated: CorePriority[];
    if (exists) {
      if (current.length === 1) return; // Keep at least one
      updated = current.filter((p) => p !== priority);
    } else {
      if (current.length >= 4) return;
      updated = [...current, priority];
    }
    updateField("corePriorities", updated);
  };

  const handleApplyPreset = () => {
    setFormData({ ...DEFAULT_INTAKE_VALUES });
    setErrors({});
  };

  // Step-level validation
  const validateStep = (step: number): boolean => {
    const stepErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.age || formData.age < 18 || formData.age > 100) {
        stepErrors["age"] = "Age must be between 18 and 100";
      }
      if (!formData.currentLocation || formData.currentLocation.trim().length < 2) {
        stepErrors["currentLocation"] = "Current city/location is required";
      }
      if (formData.liquidSavings < 0) {
        stepErrors["liquidSavings"] = "Liquid savings cannot be negative";
      }
      if (!formData.monthlyBurn || formData.monthlyBurn <= 0) {
        stepErrors["monthlyBurn"] = "Monthly expenses must be greater than zero";
      }
    } else if (step === 2) {
      if (!formData.corePriorities || formData.corePriorities.length === 0) {
        stepErrors["corePriorities"] = "Select at least 1 core priority";
      }
    } else if (step === 3) {
      if (!formData.decisionPrompt || formData.decisionPrompt.trim().length < 10) {
        stepErrors["decisionPrompt"] =
          "Dilemma prompt must be at least 10 characters";
      }
    } else if (step === 4) {
      if (!formData.optionA.name || formData.optionA.name.trim().length < 2) {
        stepErrors["optionA.name"] = "Branch A name is required";
      }
      if (!formData.optionA.location || formData.optionA.location.trim().length < 2) {
        stepErrors["optionA.location"] = "Branch A location is required";
      }
      if (
        !formData.optionA.description ||
        formData.optionA.description.trim().length < 10
      ) {
        stepErrors["optionA.description"] =
          "Description must be at least 10 characters";
      }
    } else if (step === 5) {
      if (!formData.optionB.name || formData.optionB.name.trim().length < 2) {
        stepErrors["optionB.name"] = "Branch B name is required";
      }
      if (!formData.optionB.location || formData.optionB.location.trim().length < 2) {
        stepErrors["optionB.location"] = "Branch B location is required";
      }
      if (
        !formData.optionB.description ||
        formData.optionB.description.trim().length < 10
      ) {
        stepErrors["optionB.description"] =
          "Description must be at least 10 characters";
      }
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep === 3) {
        const crisis = evaluateIntakeSafety({ decisionPrompt: formData.decisionPrompt });
        if (crisis.isCrisis) {
          setCrisisResult(crisis);
          return;
        }
      } else if (currentStep === 4) {
        const crisis = evaluateIntakeSafety({
          optionA: { name: formData.optionA.name, description: formData.optionA.description },
        });
        if (crisis.isCrisis) {
          setCrisisResult(crisis);
          return;
        }
      }
      setCurrentStep((prev) => Math.min(5, prev + 1));
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Deterministic crisis safety guardrail check
    const crisisCheck = evaluateIntakeSafety(formData);
    if (crisisCheck.isCrisis) {
      setCrisisResult(crisisCheck);
      return;
    }

    const result = validateIntakeInput(formData);
    if (!result.success && result.errors) {
      setErrors(result.errors);
      // Find the first error step
      if (
        result.errors["age"] ||
        result.errors["currentLocation"] ||
        result.errors["liquidSavings"] ||
        result.errors["monthlyBurn"]
      ) {
        setCurrentStep(1);
      } else if (result.errors["corePriorities"]) {
        setCurrentStep(2);
      } else if (result.errors["decisionPrompt"]) {
        setCurrentStep(3);
      } else if (
        result.errors["optionA.name"] ||
        result.errors["optionA.location"] ||
        result.errors["optionA.description"]
      ) {
        setCurrentStep(4);
      } else if (
        result.errors["optionB.name"] ||
        result.errors["optionB.location"] ||
        result.errors["optionB.description"]
      ) {
        setCurrentStep(5);
      }
      return;
    }

    if (result.success && result.data) {
      setIsSubmitted(true);
      if (onSubmitSuccess) {
        onSubmitSuccess(result.data);
      }
    }
  };

  if (isSubmitted) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/90 p-8 text-center max-w-xl mx-auto shadow-2xl backdrop-blur">
        <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center text-xl font-bold mb-4">
          ✓
        </div>
        <h3 className="text-xl font-semibold text-zinc-100 mb-2">
          Intake Verified & Prepared
        </h3>
        <p className="text-sm text-zinc-400 mb-6">
          Your dilemma has been validated against all statistical and financial boundaries.
          Ready to seed 12 divergent timelines across Path A (
          <span className="text-zinc-200">{formData.optionA.name}</span>) and Path B (
          <span className="text-zinc-200">{formData.optionB.name}</span>).
        </p>

        <div className="p-4 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-left text-xs text-zinc-400 space-y-2 mb-6">
          <div className="flex justify-between">
            <span className="text-zinc-500">Demographic:</span>
            <span className="text-zinc-200">
              {formData.age} yo • {formData.currentLocation}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Financial Base:</span>
            <span className="text-zinc-200">
              ${formData.liquidSavings.toLocaleString()} Liquid • ${formData.monthlyBurn.toLocaleString()}/mo
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Core Priorities:</span>
            <span className="text-zinc-200 uppercase">
              {formData.corePriorities.join(" • ")}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsSubmitted(false)}
          className="px-4 py-2 text-xs font-medium rounded border border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition"
        >
          Edit Intake Inputs
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800/90 bg-zinc-900/80 p-6 md:p-8 max-w-2xl mx-auto shadow-2xl backdrop-blur">
      {/* Top Bar with Step Indicators */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-5 mb-6">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-400">
            Step {currentStep} of 5
          </span>
          <h2 className="text-lg font-semibold text-zinc-100">
            {currentStep === 1 && "Personal & Financial Foundation"}
            {currentStep === 2 && "Core Values & Psychological Drivers"}
            {currentStep === 3 && "The Dilemma & Crossroad Prompt"}
            {currentStep === 4 && "Counterfactual Path A (Option A)"}
            {currentStep === 5 && "Counterfactual Path B & Final Review"}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleApplyPreset}
            className="text-xs text-zinc-400 hover:text-zinc-200 underline underline-offset-4"
          >
            Load Example
          </button>
        </div>
      </div>

      {/* Progress Pills */}
      <div className="grid grid-cols-5 gap-1.5 mb-8">
        {[1, 2, 3, 4, 5].map((s) => (
          <div
            key={s}
            className={`h-1.5 rounded-full transition-all ${
              s === currentStep
                ? "bg-emerald-500"
                : s < currentStep
                ? "bg-zinc-600"
                : "bg-zinc-800"
            }`}
          />
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Demographics & Financial Snapshot */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <p className="text-xs text-zinc-400 leading-relaxed">
              Provides the initial mathematical parameters for the zero-token compounding engine
              and runway health score.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Current Age (18–100)
                </label>
                <input
                  type="number"
                  min={18}
                  max={100}
                  value={formData.age}
                  onChange={(e) => updateField("age", parseInt(e.target.value) || 0)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm text-zinc-100 bg-zinc-950/70 focus:outline-none transition ${
                    errors["age"]
                      ? "border-rose-500/80 focus:border-rose-500"
                      : "border-zinc-800 focus:border-zinc-600"
                  }`}
                  placeholder="26"
                />
                {errors["age"] && (
                  <span className="text-[11px] text-rose-400 mt-1 block">
                    {errors["age"]}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Current City / Base
                </label>
                <input
                  type="text"
                  value={formData.currentLocation}
                  onChange={(e) => updateField("currentLocation", e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm text-zinc-100 bg-zinc-950/70 focus:outline-none transition ${
                    errors["currentLocation"]
                      ? "border-rose-500/80 focus:border-rose-500"
                      : "border-zinc-800 focus:border-zinc-600"
                  }`}
                  placeholder="e.g. Bengaluru, India"
                />
                {errors["currentLocation"] && (
                  <span className="text-[11px] text-rose-400 mt-1 block">
                    {errors["currentLocation"]}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Liquid Savings ($ USD)
                </label>
                <input
                  type="number"
                  min={0}
                  value={formData.liquidSavings}
                  onChange={(e) =>
                    updateField("liquidSavings", parseFloat(e.target.value) || 0)
                  }
                  className={`w-full rounded-lg border px-3 py-2 text-sm text-zinc-100 bg-zinc-950/70 focus:outline-none transition ${
                    errors["liquidSavings"]
                      ? "border-rose-500/80 focus:border-rose-500"
                      : "border-zinc-800 focus:border-zinc-600"
                  }`}
                  placeholder="25000"
                />
                {errors["liquidSavings"] && (
                  <span className="text-[11px] text-rose-400 mt-1 block">
                    {errors["liquidSavings"]}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Monthly Living Burn ($ USD/mo)
                </label>
                <input
                  type="number"
                  min={1}
                  value={formData.monthlyBurn}
                  onChange={(e) =>
                    updateField("monthlyBurn", parseFloat(e.target.value) || 0)
                  }
                  className={`w-full rounded-lg border px-3 py-2 text-sm text-zinc-100 bg-zinc-950/70 focus:outline-none transition ${
                    errors["monthlyBurn"]
                      ? "border-rose-500/80 focus:border-rose-500"
                      : "border-zinc-800 focus:border-zinc-600"
                  }`}
                  placeholder="1800"
                />
                {errors["monthlyBurn"] && (
                  <span className="text-[11px] text-rose-400 mt-1 block">
                    {errors["monthlyBurn"]}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Core Priorities */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <p className="text-xs text-zinc-400 leading-relaxed">
              Weights user satisfaction curves and informs the Gemini narrator on your
              psychological trade-offs. Select 1 to 4 core drivers.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRIORITY_OPTIONS.map((opt) => {
                const selected = formData.corePriorities.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => togglePriority(opt.id)}
                    className={`p-3.5 rounded-lg border text-left transition flex flex-col justify-between ${
                      selected
                        ? "border-emerald-500/60 bg-emerald-500/10 text-zinc-100"
                        : "border-zinc-800/80 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold">{opt.label}</span>
                        {selected && (
                          <span className="text-[10px] text-emerald-400 font-mono">
                            SELECTED
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-normal">
                        {opt.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {errors["corePriorities"] && (
              <span className="text-[11px] text-rose-400 block">
                {errors["corePriorities"]}
              </span>
            )}
          </div>
        )}

        {/* Step 3: Dilemma Prompt */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <p className="text-xs text-zinc-400 leading-relaxed">
              State your real-world dilemma clearly. What decision are you struggling with?
              You can speak your dilemma or type it below.
            </p>

            <VoiceInput
              onTranscript={(transcript) => updateField("decisionPrompt", transcript)}
            />

            <div>
              <textarea
                rows={4}
                value={formData.decisionPrompt}
                onChange={(e) => updateField("decisionPrompt", e.target.value)}
                className={`w-full rounded-lg border p-3 text-sm text-zinc-100 bg-zinc-950/70 focus:outline-none transition leading-relaxed ${
                  errors["decisionPrompt"]
                    ? "border-rose-500/80 focus:border-rose-500"
                    : "border-zinc-800 focus:border-zinc-600"
                }`}
                placeholder="Should I leave my stable job to launch a startup, or take an overseas corporate transfer?"
              />
              <div className="flex justify-between items-center mt-1">
                <span className="text-[11px] text-zinc-500">
                  {formData.decisionPrompt.length} characters (min 10)
                </span>
                {errors["decisionPrompt"] && (
                  <span className="text-[11px] text-rose-400">
                    {errors["decisionPrompt"]}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Path A */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-800 text-[11px] font-semibold text-zinc-300">
              Counterfactual Branch A
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Option Name
                </label>
                <input
                  type="text"
                  value={formData.optionA.name}
                  onChange={(e) => updateBranchField("optionA", "name", e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm text-zinc-100 bg-zinc-950/70 focus:outline-none transition ${
                    errors["optionA.name"]
                      ? "border-rose-500/80 focus:border-rose-500"
                      : "border-zinc-800 focus:border-zinc-600"
                  }`}
                  placeholder="London AI Startup"
                />
                {errors["optionA.name"] && (
                  <span className="text-[11px] text-rose-400 mt-1 block">
                    {errors["optionA.name"]}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.optionA.location}
                  onChange={(e) => updateBranchField("optionA", "location", e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm text-zinc-100 bg-zinc-950/70 focus:outline-none transition ${
                    errors["optionA.location"]
                      ? "border-rose-500/80 focus:border-rose-500"
                      : "border-zinc-800 focus:border-zinc-600"
                  }`}
                  placeholder="London, UK"
                />
                {errors["optionA.location"] && (
                  <span className="text-[11px] text-rose-400 mt-1 block">
                    {errors["optionA.location"]}
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Description & Strategy
              </label>
              <textarea
                rows={3}
                value={formData.optionA.description}
                onChange={(e) => updateBranchField("optionA", "description", e.target.value)}
                className={`w-full rounded-lg border p-3 text-sm text-zinc-100 bg-zinc-950/70 focus:outline-none transition ${
                  errors["optionA.description"]
                    ? "border-rose-500/80 focus:border-rose-500"
                    : "border-zinc-800 focus:border-zinc-600"
                }`}
                placeholder="What does taking Path A entail? Highlight upside, challenges, and risks."
              />
              {errors["optionA.description"] && (
                <span className="text-[11px] text-rose-400 mt-1 block">
                  {errors["optionA.description"]}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Step 5: Path B & Review */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-800 text-[11px] font-semibold text-zinc-300">
              Counterfactual Branch B
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Option Name
                </label>
                <input
                  type="text"
                  value={formData.optionB.name}
                  onChange={(e) => updateBranchField("optionB", "name", e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm text-zinc-100 bg-zinc-950/70 focus:outline-none transition ${
                    errors["optionB.name"]
                      ? "border-rose-500/80 focus:border-rose-500"
                      : "border-zinc-800 focus:border-zinc-600"
                  }`}
                  placeholder="Delhi Corporate Lead"
                />
                {errors["optionB.name"] && (
                  <span className="text-[11px] text-rose-400 mt-1 block">
                    {errors["optionB.name"]}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.optionB.location}
                  onChange={(e) => updateBranchField("optionB", "location", e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm text-zinc-100 bg-zinc-950/70 focus:outline-none transition ${
                    errors["optionB.location"]
                      ? "border-rose-500/80 focus:border-rose-500"
                      : "border-zinc-800 focus:border-zinc-600"
                  }`}
                  placeholder="Delhi, India"
                />
                {errors["optionB.location"] && (
                  <span className="text-[11px] text-rose-400 mt-1 block">
                    {errors["optionB.location"]}
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Description & Strategy
              </label>
              <textarea
                rows={3}
                value={formData.optionB.description}
                onChange={(e) => updateBranchField("optionB", "description", e.target.value)}
                className={`w-full rounded-lg border p-3 text-sm text-zinc-100 bg-zinc-950/70 focus:outline-none transition ${
                  errors["optionB.description"]
                    ? "border-rose-500/80 focus:border-rose-500"
                    : "border-zinc-800 focus:border-zinc-600"
                }`}
                placeholder="What does taking Path B entail? Highlight advantages, sacrifices, and stability."
              />
              {errors["optionB.description"] && (
                <span className="text-[11px] text-rose-400 mt-1 block">
                  {errors["optionB.description"]}
                </span>
              )}
            </div>

            {/* Quick Review Card */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3.5 text-xs text-zinc-400 space-y-1.5">
              <div className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
                Simulation Scope Summary
              </div>
              <div className="text-zinc-300">
                12 Parallel Branches (6 for {formData.optionA.name || "Path A"}, 6 for {formData.optionB.name || "Path B"})
              </div>
              <div>
                Duration: 5 Years • 20 Quarterly Steps per Branch • Zero Predictive Claims
              </div>
            </div>
          </div>
        )}

        {/* Safety & Framing Disclaimer */}
        <div className="rounded border border-zinc-800/80 bg-zinc-950/50 p-3 text-[11px] text-zinc-400 leading-relaxed">
          <span className="font-semibold text-zinc-300">Reflective Simulation Tool:</span>{" "}
          Multiverse You does not forecast the future or offer financial, medical, or life advice.
          It provides a counterfactual sandbox to introspect your personal priorities and hidden trade-offs.
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-2">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handlePrev}
              className="px-4 py-2 rounded-lg border border-zinc-800 bg-zinc-900 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition"
            >
              Back
            </button>
          ) : onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg border border-zinc-800 bg-zinc-900 text-xs font-medium text-zinc-400 hover:bg-zinc-800 transition"
            >
              Cancel
            </button>
          ) : (
            <div />
          )}

          {currentStep < 5 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-zinc-50 transition"
            >
              Continue
            </button>
          ) : (
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-zinc-50 transition shadow-lg shadow-emerald-950"
            >
              Verify & Fork 12 Realities
            </button>
          )}
        </div>
      </form>

      <CrisisDialog
        isOpen={Boolean(crisisResult?.isCrisis)}
        onClose={() => setCrisisResult(null)}
        category={crisisResult?.category}
        matchedPattern={crisisResult?.matchedPattern}
        helplines={crisisResult?.helplines}
      />
    </div>
  );
}

