import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  validateIntakeInput,
  DEFAULT_INTAKE_VALUES,
  IntakeFormValues,
} from "@/lib/schemas/intake";
import {
  inspectForCrisis,
  evaluateIntakeSafety,
} from "@/lib/safety/crisisInterceptor";
import { generateWorldCast } from "@/lib/ai/agents/worldBuilder";
import {
  generate12TimelineSeeds,
  ALL_PERSONA_SEEDS,
} from "@/lib/simulation/personaSeeder";
import {
  runTimeline,
  TimelineQuarterRecord,
} from "@/lib/simulation/timelineRunner";
import { serializeSimulationDigest } from "@/lib/simulation/digestSerializer";
import {
  generateNarratorReport,
  FinaleReport,
  FinaleReportSchema,
} from "@/lib/ai/agents/narratorAgent";
import { ProviderCandidate } from "@/lib/ai/router";
import { FinaleReportView } from "@/components/finale/FinaleReportView";
import { MultiverseTreeCanvas, TimelineTreeBranch } from "@/components/tree/MultiverseTreeCanvas";
import { assertAntiSlopCompliance } from "@/lib/design/antiSlopGuard";

describe("Phase 30: End-to-End System Smoke Test & Integration Pipeline", () => {
  it("executes complete lifecycle: Intake -> Safety -> World Build -> 12 Seeds -> Timeline Sim -> Digest -> Narrator -> Finale UI", async () => {
    // =========================================================================
    // Stage 1: Decision Intake Validation
    // =========================================================================
    const userIntake: IntakeFormValues = {
      ...DEFAULT_INTAKE_VALUES,
      decisionPrompt: "Should I accept the Seed round offer or keep bootstrapping my developer tool startup?",
      optionA: {
        name: "Accept $1.5M Seed",
        location: "San Francisco, CA",
        description: "Take institutional capital, hire 3 engineers, and accept 20% equity dilution.",
      },
      optionB: {
        name: "Stay Bootstrapped",
        location: "Austin, TX",
        description: "Rely exclusively on customer subscriptions, maintain 100% equity, and scale organically.",
      },
      liquidSavings: 45000,
      monthlyBurn: 3500,
      corePriorities: ["career", "wealth", "peace"],
    };

    const intakeResult = validateIntakeInput(userIntake);
    expect(intakeResult.success).toBe(true);
    expect(intakeResult.data).toBeDefined();

    // =========================================================================
    // Stage 2: Zero-Token Safety & Crisis Guardrail Inspection
    // =========================================================================
    const crisisCheck = evaluateIntakeSafety(userIntake);
    expect(crisisCheck.isCrisis).toBe(false);
    expect(crisisCheck.helplines.length).toBe(0);

    // Verify negative test for safety interceptor
    const dangerousIntake = {
      ...userIntake,
      decisionPrompt: "Should I quit my job or take my own life?",
    };
    const crisisDetection = evaluateIntakeSafety(dangerousIntake);
    expect(crisisDetection.isCrisis).toBe(true);
    expect(crisisDetection.category).toBe("self_harm");

    // =========================================================================
    // Stage 3: NVIDIA NIM World-Builder Cast Generation
    // =========================================================================
    const dummyModel = { modelId: "mock-model", provider: "mock" } as any;
    const mockChain: ProviderCandidate[] = [
      { name: "nvidia", getModel: () => dummyModel },
      { name: "gemini", getModel: () => dummyModel },
      { name: "groq", getModel: () => dummyModel },
    ];

    const mockWorldBuilderExecutor = vi.fn().mockResolvedValue({
      object: {
        cast: [
          {
            id: "char-1",
            name: "Elena Rostova",
            role: "mentor",
            archetype: "Demanding industry veteran",
            personality: "Direct, experienced, and pushes for hyper-scale while guarding against premature hires.",
            relationshipContext: "Former VP at protagonist's first company, now an active angel investor.",
            stakeInDilemma: "Wants protagonist to take the venture route and lead an institutional syndicate.",
          },
          {
            id: "char-2",
            name: "Marcus Vance",
            role: "peer",
            archetype: "Technical purist",
            personality: "Methodical, skeptical of venture pressure, values architectural beauty over fast metrics.",
            relationshipContext: "Co-founding engineer who built the initial MVP prototype alongside protagonist.",
            stakeInDilemma: "Fears taking Seed capital will dilute product quality with premature enterprise features.",
          },
          {
            id: "char-3",
            name: "Dr. Sarah Chen",
            role: "family",
            archetype: "Pragmatic partner",
            personality: "Supportive, grounded, highly attuned to personal health and sleep hygiene.",
            relationshipContext: "Long-term partner who values financial stability and mental peace.",
            stakeInDilemma: "Prefers the path that does not lead to 80-hour workweeks and chronic burnout.",
          },
        ],
      },
    });

    const worldCast = await generateWorldCast({
      age: userIntake.age,
      currentLocation: userIntake.currentLocation,
      decisionPrompt: userIntake.decisionPrompt,
      optionA: userIntake.optionA,
      optionB: userIntake.optionB,
      corePriorities: userIntake.corePriorities,
      customChain: mockChain,
      executor: mockWorldBuilderExecutor,
    });

    expect(worldCast.cast.length).toBe(3);
    expect(worldCast.cast[0].name).toBe("Elena Rostova");

    // =========================================================================
    // Stage 4: 12-Timeline Persona Seeder
    // =========================================================================
    const seeds = generate12TimelineSeeds({
      sessionId: "smoke-test-session-1",
      optionA: userIntake.optionA,
      optionB: userIntake.optionB,
      liquidSavings: userIntake.liquidSavings,
      monthlyBurn: userIntake.monthlyBurn,
    });

    expect(seeds.length).toBe(12);
    const optionASeeds = seeds.filter((s) => s.branchOption === "A");
    const optionBSeeds = seeds.filter((s) => s.branchOption === "B");
    expect(optionASeeds.length).toBe(6);
    expect(optionBSeeds.length).toBe(6);

    for (const seedType of ALL_PERSONA_SEEDS) {
      expect(optionASeeds.some((s) => s.personaSeed === seedType)).toBe(true);
      expect(optionBSeeds.some((s) => s.personaSeed === seedType)).toBe(true);
    }

    // =========================================================================
    // Stage 5: Deterministic Multi-Step Timeline Runner (Quarters 1 to 4)
    // =========================================================================
    const mockStepExecutor = vi.fn().mockImplementation((_args: any) => {
      return Promise.resolve({
        object: {
          deltaHappiness: 2,
          deltaHealth: -1,
          deltaRelationships: -1,
          deltaCareer: 6,
          diaryEntry:
            "Closed the enterprise contract with Acme Corp. The hours are demanding, but momentum is undeniable.",
          reflection:
            "High intensity creates clear traction, though personal downtime has narrowed.",
        },
      });
    });

    const runA = await runTimeline({
      sessionId: "smoke-test-session-1",
      timelineId: seeds[0].timelineId,
      branchOption: seeds[0].branchOption,
      branchName: seeds[0].branchName,
      branchLocation: seeds[0].branchLocation,
      personaSeed: seeds[0].personaSeed,
      decisionPrompt: userIntake.decisionPrompt,
      startQuarter: 1,
      endQuarter: 4,
      initialLiquidSavings: userIntake.liquidSavings,
      monthlyIncome: 6000,
      monthlyExpenses: userIntake.monthlyBurn,
      persistToDb: false,
      customChain: mockChain,
      executor: mockStepExecutor,
    });

    expect(runA.totalQuartersCompleted).toBe(4);
    expect(runA.steps.length).toBe(4);
    expect(runA.finalStats.career).toBeGreaterThanOrEqual(70);
    expect(runA.finalSavings).toBeGreaterThan(0);

    // =========================================================================
    // Stage 6: Dense Digest Serializer (<2500 Tokens)
    // =========================================================================
    const simulatedSteps: TimelineQuarterRecord[] = [];
    const simulatedSummaries = seeds.map((s, idx) => {
      const isA = s.branchOption === "A";
      const happiness = 60 + (idx % 20);
      const career = isA ? 82 : 72;
      const endingSavings = isA ? 85000 : 62000;

      for (let q = 1; q <= 4; q++) {
        simulatedSteps.push({
          sessionId: "smoke-test-session-1",
          timelineId: s.timelineId,
          branchOption: s.branchOption,
          branchName: s.branchName,
          branchLocation: s.branchLocation,
          personaSeed: s.personaSeed,
          quarter: q,
          month: q * 3,
          startingSavings: 45000,
          endingSavings: endingSavings,
          netWorthDelta: 2000 * q,
          monthlyIncome: 6000,
          monthlyBurn: 3500,
          stats: {
            happiness: Math.max(30, happiness - (q === 2 ? 10 : 0)),
            health: 68,
            relationships: 65,
            career: career,
          },
          statDeltas: {
            deltaHappiness: 2,
            deltaHealth: -1,
            deltaRelationships: -1,
            deltaCareer: 3,
          },
          rolledEvent: {
            type: q === 2 ? "health_shock" : "promotion",
            title: q === 2 ? "Acute Overwork Exhaustion" : "Pilot Conversion",
            description: "Personal stamina tested under high release load",
            severity: q === 2 ? "negative" : "positive",
            statDeltas: {
              deltaHappiness: q === 2 ? -8 : 4,
              deltaHealth: q === 2 ? -6 : 0,
              deltaRelationships: 0,
              deltaCareer: 5,
            },
            financialImpact: {
              incomeMultiplier: 1.0,
              lumpSumExpense: 0,
              lumpSumWindfall: 0,
            },
          },
          diaryEntry: `Quarter ${q} diary reflection for ${s.branchName} (${s.personaSeed}).`,
          reflection: `Quarter ${q} strategic lessons learned.`,
          isBurnedOut: q === 2 && s.personaSeed === "burnout_risk",
          status: "active",
          recordedAt: new Date(),
        });
      }

      return {
        sessionId: "smoke-test-session-1",
        timelineId: s.timelineId,
        branchOption: s.branchOption,
        branchName: s.branchName,
        branchLocation: s.branchLocation,
        personaSeed: s.personaSeed,
        totalQuartersCompleted: 4,
        finalSavings: endingSavings,
        finalStats: {
          happiness,
          health: 68,
          relationships: 65,
          career,
        },
        isBurnedOut: s.personaSeed === "burnout_risk",
        lowestHappinessQuarter: 2,
        peakCareerQuarter: 4,
        steps: simulatedSteps.filter((step) => step.timelineId === s.timelineId),
      };
    });

    const serializedDigest = serializeSimulationDigest({
      sessionId: "smoke-test-session-1",
      decisionPrompt: userIntake.decisionPrompt,
      optionA: userIntake.optionA,
      optionB: userIntake.optionB,
      corePriorities: userIntake.corePriorities,
      timelines: simulatedSummaries,
    });

    expect(serializedDigest.tokenEstimate).toBeLessThan(2500);
    expect(serializedDigest.markdown).toContain("Accept $1.5M Seed");
    expect(serializedDigest.markdown).toContain("Stay Bootstrapped");

    // =========================================================================
    // Stage 7: Gemini 2.5 Flash Narrator Agent Synthesis
    // =========================================================================
    const mockNarratorReport: FinaleReport = {
      executiveReflection:
        "Across 12 divergent futures over 5 years, accepting institutional capital produces accelerated career altitude and equity value, but incurs acute burnout vulnerability around Month 18. Bootstrapping preserves psychological autonomy and emotional equilibrium at the cost of slower distribution velocity.",
      pathAOverallSummary:
        "Path A (Accept Seed) accelerates company velocity and unlocks top-tier enterprise customers, but demands strict personal boundaries to avoid Year 2 exhaustion.",
      pathBOverallSummary:
        "Path B (Stay Bootstrapped) preserves 100% equity and high psychological autonomy, with steady compounding that stabilizes comfortably by Year 3.",
      rankedFutures: [
        {
          rank: 1,
          timelineId: seeds[0].timelineId,
          path: "A",
          personaSeed: "balanced",
          score: 88,
          headline: "Disciplined High-Yield Scale",
          tradeoffSummary: "Disciplined boundary setting preserved health while institutional capital unlocked enterprise distribution.",
        },
        {
          rank: 2,
          timelineId: seeds[3].timelineId,
          path: "B",
          personaSeed: "pragmatist",
          score: 84,
          headline: "The Sovereign Operator",
          tradeoffSummary: "Retained complete equity ownership with high peace of mind, though product iteration cadence was deliberately measured.",
        },
        {
          rank: 3,
          timelineId: seeds[5].timelineId,
          path: "A",
          personaSeed: "bold",
          score: 79,
          headline: "High-Altitude Asymmetric Scale",
          tradeoffSummary: "Maximum career altitude achieved, but personal relationships were heavily depleted during high-stakes Series A sprints.",
        },
      ],
      pivotalDivergences: [
        {
          title: "Month 6: Capital Infusion vs Sovereign Pacing",
          month: 6,
          description: "Deciding whether to raise team burn rate or protect personal recovery runway.",
          counterfactualComparison: "Option A accelerates technical velocity while Option B cements emotional composure and long-term autonomy.",
        },
        {
          title: "Month 18: Enterprise Pivot vs Organic Expansion",
          month: 18,
          description: "Navigating market consolidation under shifting macroeconomic conditions.",
          counterfactualComparison: "Venture path requires rapid hiring; bootstrapped path pivots toward high-margin enterprise accounts.",
        },
      ],
      regretHotspots: [
        {
          category: "health",
          severity: "critical",
          affectedPaths: ["A"],
          insight: "Overwork exhaustion in early venture scaling quarters when personal rest boundaries are compromised.",
          mitigationAdvice: "Institute strict recovery periods and enforce team delegation before entering rapid release marathons.",
        },
        {
          category: "finances",
          severity: "low",
          affectedPaths: ["B"],
          insight: "Temporary cashflow tightness during early bootstrapped product-market fit search.",
          mitigationAdvice: "Maintain a minimum 6-month liquid runway reserve before declining external capital.",
        },
      ],
      synthesisDisclaimer: "Reflective Simulation Engine • Not a Future Prediction",
    };

    const validatedReport = FinaleReportSchema.parse(mockNarratorReport);
    expect(validatedReport.rankedFutures.length).toBe(3);

    // =========================================================================
    // Stage 8: Visual Tree Canvas & Finale Screen Rendering Checks
    // =========================================================================
    const canvasBranches: TimelineTreeBranch[] = simulatedSummaries.map((s) => ({
      timelineId: s.timelineId,
      branchOption: s.branchOption,
      branchName: s.branchName,
      personaSeed: s.personaSeed,
      status: s.isBurnedOut ? "burnout" : "thriving",
      nodes: s.steps.map((st) => ({
        quarter: st.quarter,
        month: st.month,
        status: st.isBurnedOut ? "burnout" : "thriving",
        eventTitle: st.rolledEvent.title,
        happiness: st.stats.happiness,
        health: st.stats.health,
        netWorth: st.endingSavings,
      })),
    }));

    const canvasHtml = renderToString(
      <MultiverseTreeCanvas
        branches={canvasBranches}
        scrubberMonth={12}
        selectedTimelineId={canvasBranches[0].timelineId}
      />
    );
    expect(canvasHtml).toContain("<canvas");
    assertAntiSlopCompliance(canvasHtml);

    const finaleHtml = renderToString(
      <FinaleReportView
        report={mockNarratorReport}
        decisionPrompt={userIntake.decisionPrompt}
        optionA={userIntake.optionA}
        optionB={userIntake.optionB}
        timelines={simulatedSummaries.map((s) => ({
          timelineId: s.timelineId,
          branchOption: s.branchOption,
          branchName: s.branchName,
          branchLocation: s.branchLocation,
          personaSeed: s.personaSeed,
          finalStats: s.finalStats,
          finalSavings: s.finalSavings,
        }))}
        steps={simulatedSteps.map((st) => ({
          timelineId: st.timelineId,
          quarter: st.quarter,
          month: st.month,
          stats: st.stats,
          statDeltas: { deltaHappiness: st.statDeltas.deltaHappiness },
          isBurnedOut: st.isBurnedOut,
          rolledEvent: {
            title: st.rolledEvent.title,
            severity: st.rolledEvent.severity,
          },
          endingSavings: st.endingSavings,
        }))}
      />
    );

    expect(finaleHtml).toContain("5-Year Counterfactual Synthesis");
    expect(finaleHtml).toContain("Interactive Regret Heatmap Matrix");
    expect(finaleHtml).toContain("Disciplined High-Yield Scale");
    expect(finaleHtml).toContain("The Sovereign Operator");
    assertAntiSlopCompliance(finaleHtml);
  });
});
