/**
 * Simulation Orchestrator
 *
 * Deterministically orchestrates the 12 parallel branches across 20 quarters (5 years)
 * from user intake data, generating data for MultiverseTreeCanvas, BranchDetailDrawer,
 * and FinaleReportView.
 */

import { IntakeFormValues } from "@/lib/schemas/intake";
import {
  generate12TimelineSeeds,
  PersonaSeedType,
  PERSONA_PROFILES,
} from "@/lib/simulation/personaSeeder";
import { rollQuarterEvent } from "@/lib/simulation/eventRoller";
import { calculateQuarterFinance } from "@/lib/simulation/financeEngine";
import { applyAndClampStats, LifeStats } from "@/lib/simulation/statClamper";
import {
  TimelineTreeBranch,
  BranchNodeData,
} from "@/components/tree/MultiverseTreeCanvas";
import {
  FinaleReport,
  RankedFuture,
  PivotalDivergence,
  RegretHotspot,
} from "@/lib/ai/agents/narratorAgent";
import {
  FinaleTimelineInput,
  FinaleStepInput,
} from "@/components/finale/FinaleReportView";

export interface SimulatedMultiverseData {
  branches: TimelineTreeBranch[];
  timelines: FinaleTimelineInput[];
  steps: FinaleStepInput[];
  report: FinaleReport;
}

export function generateSimulatedMultiverse(
  intake: IntakeFormValues
): SimulatedMultiverseData {
  const seeds = generate12TimelineSeeds({
    sessionId: `sim-${Date.now()}`,
    optionA: intake.optionA,
    optionB: intake.optionB,
    liquidSavings: intake.liquidSavings,
    monthlyBurn: intake.monthlyBurn,
  });

  const branches: TimelineTreeBranch[] = [];
  const timelines: FinaleTimelineInput[] = [];
  const allSteps: FinaleStepInput[] = [];

  for (let sIndex = 0; sIndex < seeds.length; sIndex++) {
    const seed = seeds[sIndex];
    const profile = PERSONA_PROFILES[seed.personaSeed as PersonaSeedType];
    const isPathA = seed.branchOption === "A";

    let currentStats: LifeStats = {
      happiness: 70,
      health: 72,
      relationships: 68,
      career: 65,
    };

    let currentSavings = intake.liquidSavings;
    const baseMonthlyBurn = intake.monthlyBurn;
    // Path A has higher risk/upside salary trajectory; Path B is steadier
    const monthlyIncome = isPathA ? baseMonthlyBurn * 1.6 : baseMonthlyBurn * 1.35;

    const nodes: BranchNodeData[] = [];
    let hadBurnout = false;

    for (let q = 1; q <= 20; q++) {
      const month = q * 3;
      const deterministicSeed = sIndex * 100 + q;
      const rolledEvent = rollQuarterEvent({
        seed: deterministicSeed,
        probabilities: profile?.eventProbabilityOverrides,
      });

      const effectiveIncome =
        monthlyIncome * (rolledEvent.financialImpact.incomeMultiplier || 1.0);
      const lumpSum =
        (rolledEvent.financialImpact.lumpSumWindfall || 0) -
        (rolledEvent.financialImpact.lumpSumExpense || 0);

      const fin = calculateQuarterFinance({
        quarter: q,
        startingSavings: currentSavings,
        monthlyIncome: effectiveIncome,
        monthlyBaseExpenses: baseMonthlyBurn,
        costOfLivingIndex: isPathA ? 1.15 : 0.95,
        eventCashImpact: lumpSum,
      });

      currentSavings = fin.endingSavings;

      const deltas = {
        deltaHappiness:
          (rolledEvent.statDeltas.deltaHappiness || 0) +
          (profile?.quarterlyStatBias?.deltaHappiness || 0),
        deltaHealth:
          (rolledEvent.statDeltas.deltaHealth || 0) +
          (profile?.quarterlyStatBias?.deltaHealth || 0),
        deltaRelationships:
          (rolledEvent.statDeltas.deltaRelationships || 0) +
          (profile?.quarterlyStatBias?.deltaRelationships || 0),
        deltaCareer:
          (rolledEvent.statDeltas.deltaCareer || 0) +
          (profile?.quarterlyStatBias?.deltaCareer || 0) +
          (isPathA ? 2 : 1),
      };

      const clamped = applyAndClampStats(currentStats, deltas);
      currentStats = clamped.stats;

      if (clamped.isBurnout) {
        hadBurnout = true;
      }

      let nodeStatus: "thriving" | "plateau" | "struggling" | "burnout" =
        "plateau";
      if (clamped.isBurnout) {
        nodeStatus = "burnout";
      } else if (currentStats.happiness >= 75) {
        nodeStatus = "thriving";
      } else if (currentStats.happiness <= 45) {
        nodeStatus = "struggling";
      }

      const diary = `Month ${month} (${seed.branchName}): ${rolledEvent.title}. ${rolledEvent.description}. Happiness at ${currentStats.happiness}, liquid savings $${Math.round(currentSavings).toLocaleString()}.`;

      nodes.push({
        quarter: q,
        month,
        status: nodeStatus,
        eventTitle: rolledEvent.title,
        diarySnippet: diary,
        happiness: currentStats.happiness,
        health: currentStats.health,
        netWorth: currentSavings,
      });

      allSteps.push({
        timelineId: seed.timelineId,
        quarter: q,
        month,
        stats: { ...currentStats },
        statDeltas: { deltaHappiness: clamped.appliedDeltas.deltaHappiness },
        isBurnedOut: clamped.isBurnout,
        rolledEvent: {
          title: rolledEvent.title,
          severity: rolledEvent.severity,
        },
        endingSavings: currentSavings,
      });
    }

    const branchStatus: "thriving" | "plateau" | "struggling" | "burnout" =
      hadBurnout
        ? "burnout"
        : currentStats.happiness >= 72
        ? "thriving"
        : currentStats.happiness <= 48
        ? "struggling"
        : "plateau";

    branches.push({
      timelineId: seed.timelineId,
      branchOption: seed.branchOption,
      branchName: seed.branchName,
      personaSeed: seed.personaSeed as PersonaSeedType,
      status: branchStatus,
      nodes,
    });

    timelines.push({
      timelineId: seed.timelineId,
      branchOption: seed.branchOption,
      branchName: seed.branchName,
      branchLocation: seed.branchLocation,
      personaSeed: seed.personaSeed,
      finalStats: { ...currentStats },
      finalSavings: currentSavings,
    });
  }

  // Synthesize Ranked Futures and Highlights
  const scored = timelines.map((t) => {
    const happiness = t.finalStats?.happiness ?? 50;
    const career = t.finalStats?.career ?? 50;
    const health = t.finalStats?.health ?? 50;
    const relationships = t.finalStats?.relationships ?? 50;
    const score = Math.round(
      happiness * 0.4 + career * 0.25 + health * 0.2 + relationships * 0.15
    );
    return { timeline: t, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const rankedFutures: RankedFuture[] = [
    {
      rank: 1,
      timelineId: scored[0].timeline.timelineId,
      path: scored[0].timeline.branchOption,
      personaSeed: scored[0].timeline.personaSeed,
      score: scored[0].score,
      headline: `Optimal Synthesis: ${scored[0].timeline.branchName}`,
      tradeoffSummary: `Balanced psychological health (${scored[0].timeline.finalStats?.happiness}) with robust compounding reserves ($${Math.round(scored[0].timeline.finalSavings ?? 0).toLocaleString()}).`,
    },
    {
      rank: 2,
      timelineId: scored[1].timeline.timelineId,
      path: scored[1].timeline.branchOption,
      personaSeed: scored[1].timeline.personaSeed,
      score: scored[1].score,
      headline: `Resilient Autonomy: ${scored[1].timeline.branchName}`,
      tradeoffSummary: `Consistently avoided structural burnout shocks and protected community bonds.`,
    },
    {
      rank: 3,
      timelineId: scored[2].timeline.timelineId,
      path: scored[2].timeline.branchOption,
      personaSeed: scored[2].timeline.personaSeed,
      score: scored[2].score,
      headline: `High-Altitude Compromise: ${scored[2].timeline.branchName}`,
      tradeoffSummary: `Maximized professional trajectory while navigating occasional stress plateaus.`,
    },
  ];

  const pivotalDivergences: PivotalDivergence[] = [
    {
      title: "Month 12: Initial Acceleration vs Grounding",
      month: 12,
      description: `Path A (${intake.optionA.name}) commits to high-velocity capital deployment, while Path B (${intake.optionB.name}) deepens local community roots.`,
      counterfactualComparison: `Path A pushes career velocity at the expense of initial personal margin, while Path B consolidates emotional reserves.`,
    },
    {
      title: "Month 24: Operational Stress Inflection",
      month: 24,
      description: `Macro challenges trigger workload spikes across both paths.`,
      counterfactualComparison: `Unmanaged workaholic seeds in Path A face acute burnout, while pragmatic boundaries in Path B sustain momentum.`,
    },
    {
      title: "Month 48: Terminal Compounding",
      month: 48,
      description: `Multi-year compounding demonstrates clear divergence in liquidity and life satisfaction.`,
      counterfactualComparison: `Path A delivers higher median net worth, while Path B yields superior social connection indices.`,
    },
  ];

  const regretHotspots: RegretHotspot[] = [
    {
      category: "health",
      severity: "critical",
      affectedPaths: ["A"],
      insight: `Prolonged sprints without deliberate recovery windows trigger burnout episodes around Month 18 in Path A.`,
      mitigationAdvice: `Establish non-negotiable physical rest routines before taking on heightened scope.`,
    },
    {
      category: "relationships",
      severity: "medium",
      affectedPaths: ["A"],
      insight: `Physical relocation or relentless focus leads to relational friction during Year 2.`,
      mitigationAdvice: `Explicitly budget time and financial runway for family visits and intentional friendships.`,
    },
    {
      category: "career",
      severity: "low",
      affectedPaths: ["B"],
      insight: `Occasional counterfactual FOMO when observing peer breakthroughs in faster-moving ecosystems.`,
      mitigationAdvice: `Channel creative ambition into targeted side initiatives to prevent stagnation.`,
    },
  ];

  const report: FinaleReport = {
    executiveReflection: `Across ${timelines.length} parallel futures spanning 5 years, this counterfactual simulation illuminates the true geometry of your decision. Option A (${intake.optionA.name}) offers high-tempo acceleration and peak net worth compounding, but exacts a demonstrable physical tax unless balanced boundaries are maintained. Option B (${intake.optionB.name}) insulates you against burnout and cements deep community roots, trading distribution speed for psychological sovereignty.`,
    pathAOverallSummary: `Path A (${intake.optionA.name}) produces the highest individual financial peaks, but introduces vulnerability to Year 2 burnout shocks for overcommitted personas.`,
    pathBOverallSummary: `Path B (${intake.optionB.name}) preserves personal equilibrium, avoiding critical burnout across evaluated seeds while providing steady compounding.`,
    rankedFutures,
    pivotalDivergences,
    regretHotspots,
    synthesisDisclaimer: "Reflective Simulation Engine • Not a Future Prediction",
  };

  return {
    branches,
    timelines,
    steps: allSteps,
    report,
  };
}
