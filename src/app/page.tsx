"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { IntakeForm } from "@/components/intake/IntakeForm";
import { IntakeFormValues, DEFAULT_INTAKE_VALUES } from "@/lib/schemas/intake";
import {
  MultiverseTreeCanvas,
  TimelineTreeBranch,
} from "@/components/tree/MultiverseTreeCanvas";
import { TimeScrubber } from "@/components/tree/TimeScrubber";
import {
  BranchDetailDrawer,
  TimelineDetailData,
} from "@/components/tree/BranchDetailDrawer";
import { FinaleReportView } from "@/components/finale/FinaleReportView";
import {
  generateSimulatedMultiverse,
  SimulatedMultiverseData,
} from "@/lib/simulation/simulationOrchestrator";
import { TimelineStepDocument } from "@/lib/db/models/Simulation";
import { PersonaSeedType } from "@/lib/simulation/personaSeeder";

type AppViewMode = "welcome" | "intake" | "multiverse" | "finale";

export default function Home() {
  const [viewMode, setViewMode] = useState<AppViewMode>("welcome");
  const [intakeData, setIntakeData] = useState<IntakeFormValues>(DEFAULT_INTAKE_VALUES);
  const [simData, setSimData] = useState<SimulatedMultiverseData | null>(null);

  // Time scrubber state
  const [scrubberMonth, setScrubberMonth] = useState<number>(60);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // Selected branch/node detail state
  const [selectedTimelineId, setSelectedTimelineId] = useState<string | undefined>(undefined);
  const [selectedQuarter, setSelectedQuarter] = useState<number>(20);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Autoplay scrubber effect
  useEffect(() => {
    if (!isPlaying || viewMode !== "multiverse") return;

    const intervalMs = Math.max(100, Math.floor(400 / playbackSpeed));
    const timer = setInterval(() => {
      setScrubberMonth((prev) => {
        if (prev >= 60) {
          setIsPlaying(false);
          return 60;
        }
        return prev + 3;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, viewMode]);

  // Handle successful intake submission
  const handleIntakeSubmit = useCallback((values: IntakeFormValues) => {
    setIntakeData(values);
    const generated = generateSimulatedMultiverse(values);
    setSimData(generated);
    setScrubberMonth(60);
    setViewMode("multiverse");
  }, []);

  // Handle preset quick-start
  const handleStartPreset = (type: "startup" | "relocation") => {
    let preset: IntakeFormValues;
    if (type === "startup") {
      preset = {
        ...DEFAULT_INTAKE_VALUES,
        age: 28,
        currentLocation: "San Francisco, CA",
        decisionPrompt:
          "Should I accept $1.5M in institutional Seed funding, or bootstrap sustainably on customer revenue?",
        optionA: {
          name: "Accept $1.5M Seed",
          location: "San Francisco, CA",
          description: "Take venture capital, hire 4 core engineers, and aim for hyper-scale Series A metrics.",
        },
        optionB: {
          name: "Stay Bootstrapped",
          location: "San Francisco, CA",
          description: "Fund growth exclusively from customer subscriptions, maintaining 100% equity ownership.",
        },
        liquidSavings: 45000,
        monthlyBurn: 3500,
        corePriorities: ["career", "wealth", "peace"],
      };
    } else {
      preset = {
        ...DEFAULT_INTAKE_VALUES,
        age: 31,
        currentLocation: "Bengaluru, India",
        decisionPrompt:
          "Should I relocate to London for an early-stage AI startup role, or accept a tech lead promotion in Delhi?",
        optionA: {
          name: "Relocate to London",
          location: "London, UK",
          description: "Join international AI founding team with high equity and global exposure.",
        },
        optionB: {
          name: "Tech Lead in Delhi",
          location: "Delhi, India",
          description: "Step into senior corporate leadership with family proximity and low living costs.",
        },
        liquidSavings: 35000,
        monthlyBurn: 2200,
        corePriorities: ["career", "relationships", "wealth"],
      };
    }

    setIntakeData(preset);
    const generated = generateSimulatedMultiverse(preset);
    setSimData(generated);
    setScrubberMonth(60);
    setViewMode("multiverse");
  };

  // Convert simData steps into TimelineStepDocument format for BranchDetailDrawer
  const drawerTimelineData: TimelineDetailData | null = useMemo(() => {
    if (!selectedTimelineId || !simData) return null;
    const found = simData.timelines.find((t) => t.timelineId === selectedTimelineId);
    if (!found) return null;
    return {
      timelineId: found.timelineId,
      branchOption: found.branchOption,
      branchName: found.branchName,
      branchLocation: found.branchLocation,
      personaSeed: found.personaSeed,
      totalQuartersCompleted: 20,
      finalStats: found.finalStats,
      finalSavings: found.finalSavings,
    };
  }, [selectedTimelineId, simData]);

  const drawerSteps: TimelineStepDocument[] = useMemo(() => {
    if (!selectedTimelineId || !simData) return [];
    return simData.steps
      .filter((s) => s.timelineId === selectedTimelineId)
      .map((s) => ({
        sessionId: "live-session",
        timelineId: s.timelineId,
        branchOption: s.timelineId.includes("B") ? "B" : "A",
        branchName: "Simulated Branch",
        branchLocation: "Active Location",
        personaSeed: (drawerTimelineData?.personaSeed as PersonaSeedType) || "balanced",
        quarter: s.quarter,
        month: s.month,
        startingSavings: s.endingSavings ?? 0,
        endingSavings: s.endingSavings ?? 0,
        netWorthDelta: 0,
        monthlyIncome: 6000,
        monthlyBurn: 3500,
        stats: s.stats,
        statDeltas: {
          deltaHappiness: s.statDeltas?.deltaHappiness ?? 0,
          deltaHealth: 0,
          deltaRelationships: 0,
          deltaCareer: 0,
        },
        rolledEvent: {
          type: "steady",
          title: s.rolledEvent?.title ?? "Quarterly Progression",
          description: "Sustained execution across quarter",
          severity: s.rolledEvent?.severity ?? "neutral",
          statDeltas: {
            deltaHappiness: 0,
            deltaHealth: 0,
            deltaRelationships: 0,
            deltaCareer: 0,
          },
          financialImpact: {
            incomeMultiplier: 1.0,
            lumpSumExpense: 0,
            lumpSumWindfall: 0,
          },
        },
        diaryEntry: `Quarter ${s.quarter} journal reflection. Happiness: ${s.stats.happiness}.`,
        reflection: "Consistent long-term progress.",
        isBurnedOut: !!s.isBurnedOut,
        status: "active",
        recordedAt: new Date(),
      }));
  }, [selectedTimelineId, simData]);

  const handleSelectNode = (timelineId: string, quarter: number) => {
    setSelectedTimelineId(timelineId);
    setSelectedQuarter(quarter);
    setIsDrawerOpen(true);
  };

  const handleSelectBranch = (timelineId: string) => {
    setSelectedTimelineId(timelineId);
    setSelectedQuarter(Math.min(20, Math.ceil(scrubberMonth / 3)) || 1);
    setIsDrawerOpen(true);
  };

  return (
    <main className="min-h-screen flex flex-col justify-between p-4 sm:p-6 md:p-10 max-w-7xl mx-auto selection:bg-emerald-500/20">
      {/* Top Header */}
      <header className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-widest font-bold text-zinc-200">
              Multiverse You
            </span>
            <span className="text-[10px] text-zinc-400 font-mono hidden sm:inline">
              Reflective Simulation Engine • Not a Future Prediction
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {viewMode === "multiverse" && (
            <button
              type="button"
              onClick={() => setViewMode("finale")}
              className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-zinc-50 transition shadow-sm"
            >
              Synthesize Gemini Finale →
            </button>
          )}

          {viewMode === "finale" && (
            <button
              type="button"
              onClick={() => setViewMode("multiverse")}
              className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition"
            >
              ◀ Return to Tree Canvas
            </button>
          )}

          {viewMode !== "welcome" && (
            <button
              type="button"
              onClick={() => setViewMode("welcome")}
              className="px-3 py-1.5 rounded-md text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 transition"
            >
              Reset
            </button>
          )}

          <div className="text-[11px] text-zinc-300 font-mono bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800 hidden md:block">
            {viewMode === "welcome"
              ? "Phase 30: Ready"
              : viewMode === "intake"
              ? "Profiler Active"
              : viewMode === "multiverse"
              ? "12 Parallel Timelines"
              : "Finale Synthesis"}
          </div>
        </div>
      </header>

      {/* Main Content Stage */}
      <div className="my-auto py-2">
        {/* VIEW 1: Welcome & Overview */}
        {viewMode === "welcome" && (
          <section className="flex flex-col gap-8 max-w-3xl mx-auto text-left py-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-zinc-800 bg-zinc-900/60 text-xs text-zinc-400 w-fit">
              <span>Counterfactual Reflection Engine</span>
              <span className="text-zinc-600">•</span>
              <span>12 Divergent Branches</span>
              <span className="text-zinc-600">•</span>
              <span>5-Year Horizon</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-zinc-100 leading-tight">
              Fork a single real-world decision into 12 parallel simulated futures.
            </h1>

            <p className="text-zinc-300 text-base md:text-lg leading-relaxed">
              Explore your personal trade-offs quarter-by-quarter across 5 simulated years.
              Analyze where burnout emerges, how financial runway compounds, and what life feels
              like when you take the leap vs staying the course.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => setViewMode("intake")}
                className="px-6 py-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold text-zinc-50 transition shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2"
              >
                <span>Begin Decision Intake</span>
                <span className="text-emerald-200">→</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStartPreset("startup")}
                  className="px-4 py-3 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900 text-xs text-zinc-300 transition"
                >
                  Quick Demo: Seed vs Bootstrap
                </button>
                <button
                  type="button"
                  onClick={() => handleStartPreset("relocation")}
                  className="px-4 py-3 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900 text-xs text-zinc-300 transition"
                >
                  Quick Demo: London vs Delhi
                </button>
              </div>
            </div>

            {/* Zero-Token Math & Anti-AI-Slop Manifesto Invariant Card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
              <div className="p-4 rounded-lg bg-zinc-900/40 border border-zinc-800/80 flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-zinc-200">Zero-Token Math</span>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Deterministic TypeScript engines compute financial balances and stat bounds. The LLM never hallucinates compounding numbers.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-zinc-900/40 border border-zinc-800/80 flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-zinc-200">12 Parallel Personas</span>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Bold, Anxious, Workaholic, Balanced, Pragmatist, and Burnout Risk archetypes fork across both options.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-zinc-900/40 border border-zinc-800/80 flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-zinc-200">Long-Context Synthesis</span>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Gemini 2.5 Flash digests 240 simulation steps into ranked futures, regret hotspots, and divergence moments.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-zinc-800 bg-zinc-900/30 text-xs text-zinc-400">
              <span className="text-zinc-200 font-semibold">Framing Invariant:</span> Multiverse
              You is a reflective tool for personal introspection, not an oracle or predictive forecast.
            </div>
          </section>
        )}

        {/* VIEW 2: Intake Profiler */}
        {viewMode === "intake" && (
          <section className="py-2">
            <IntakeForm
              initialValues={intakeData}
              onCancel={() => setViewMode("welcome")}
              onSubmitSuccess={handleIntakeSubmit}
            />
          </section>
        )}

        {/* VIEW 3: Interactive Multiverse Tree Canvas HUD */}
        {viewMode === "multiverse" && simData && (
          <section className="flex flex-col gap-5 w-full">
            {/* Multiverse HUD Strip */}
            <div className="flex items-center justify-between flex-wrap gap-4 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Simulating 12 Realities:
                  </span>
                  <span className="text-xs font-bold text-zinc-200">&ldquo;{intakeData.decisionPrompt}&rdquo;</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-sky-400 font-medium">Path A: {intakeData.optionA.name} ({intakeData.optionA.location})</span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-amber-400 font-medium">Path B: {intakeData.optionB.name} ({intakeData.optionB.location})</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode("finale")}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-zinc-50 transition shadow-md shadow-emerald-950 flex items-center gap-1.5"
                >
                  <span>Synthesize Gemini Finale</span>
                  <span>→</span>
                </button>
              </div>
            </div>

            {/* Canvas Branching Tree Visualizer */}
            <div className="relative rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
              <MultiverseTreeCanvas
                branches={simData.branches}
                scrubberMonth={scrubberMonth}
                selectedTimelineId={selectedTimelineId}
                selectedQuarter={selectedQuarter}
                onSelectNode={handleSelectNode}
                onSelectBranch={handleSelectBranch}
                className="w-full h-[520px]"
              />

              {/* In-Canvas Hint */}
              <div className="absolute top-3 left-3 bg-zinc-900/80 backdrop-blur-xs border border-zinc-800 px-3 py-1.5 rounded text-[11px] text-zinc-400 select-none pointer-events-none">
                Click any timeline node or path to open the quarterly diary drawer
              </div>
            </div>

            {/* Interactive Time Scrubber */}
            <TimeScrubber
              currentMonth={scrubberMonth}
              onMonthChange={setScrubberMonth}
              maxMonth={60}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying(!isPlaying)}
              playbackSpeed={playbackSpeed}
              onSpeedChange={setPlaybackSpeed}
            />

            {/* Deep-Dive Branch Diary Drawer */}
            <BranchDetailDrawer
              isOpen={isDrawerOpen}
              onClose={() => setIsDrawerOpen(false)}
              timeline={drawerTimelineData}
              steps={drawerSteps}
              activeQuarter={selectedQuarter}
              onSelectQuarter={(q) => {
                setSelectedQuarter(q);
                setScrubberMonth(q * 3);
              }}
            />
          </section>
        )}

        {/* VIEW 4: Gemini Finale Screen & Regret Heatmap */}
        {viewMode === "finale" && simData && (
          <section className="py-2">
            <FinaleReportView
              report={simData.report}
              decisionPrompt={intakeData.decisionPrompt}
              optionA={intakeData.optionA}
              optionB={intakeData.optionB}
              timelines={simData.timelines}
              steps={simData.steps}
              onExploreTree={() => setViewMode("multiverse")}
              onRestart={() => setViewMode("welcome")}
            />
          </section>
        )}
      </div>

      {/* Bottom Footer Info */}
      <footer className="border-t border-zinc-800 pt-5 mt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs text-zinc-500">
        <div>Typography: Poppins • Palette: Warm Slate • Stack: Next.js 16, TypeScript, Tailwind CSS v4</div>
        <div className="font-mono">Multiverse You • Anti-AI-Slop Certified Engine</div>
      </footer>
    </main>
  );
}
